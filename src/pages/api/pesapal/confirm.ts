import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getTransactionStatus } from '../../../lib/pesapal';
import { sendPaymentSuccessEmail, sendPaymentFailedEmail } from '../../../lib/notify';

async function logEvent(type: string, payload: any) {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.from('webhook_events').insert({ provider: 'pesapal', type, payload });
  } catch {}
}

async function activateSubscription(userId: string, merchantRef: string, amount: number, currency: string, durationMonths: number) {
  if (!supabaseAdmin) return;

  // Deduplicate: get all rows, keep most recent, delete rest
  const { data: existingSubs } = await supabaseAdmin
    .from('user_subscriptions')
    .select('id, expires_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (existingSubs && existingSubs.length > 1) {
    const idsToDelete = existingSubs.slice(1).map((s: any) => s.id);
    await supabaseAdmin.from('user_subscriptions').delete().in('id', idsToDelete);
  }

  const current = existingSubs && existingSubs.length > 0 ? existingSubs[0] : null;
  const base = current?.expires_at ? new Date(current.expires_at) : new Date();
  const next = new Date(base.getTime());
  next.setMonth(next.getMonth() + durationMonths);

  if (current) {
    const { error: sErr } = await supabaseAdmin
      .from('user_subscriptions')
      .update({ status: 'active', expires_at: next.toISOString() })
      .eq('id', current.id);
    if (sErr) console.warn('[confirm][subscription][warn]', sErr.message);
  } else {
    const { error: sErr } = await supabaseAdmin
      .from('user_subscriptions')
      .insert({ user_id: userId, status: 'active', expires_at: next.toISOString() });
    if (sErr) console.warn('[confirm][subscription][warn]', sErr.message);
  }

  // Billing history (idempotent: check if already exists)
  const { data: existingBilling } = await supabaseAdmin
    .from('billing_history')
    .select('id')
    .eq('transaction_id', merchantRef)
    .limit(1);
  if (!existingBilling || existingBilling.length === 0) {
    await supabaseAdmin.from('billing_history').insert({
      user_id: userId,
      transaction_id: merchantRef,
      amount,
      currency,
      description: `Subscription payment (${durationMonths} month${durationMonths > 1 ? 's' : ''})`,
    });
  }

  // Send push notification
  try {
    const { data: tokens } = await supabaseAdmin.from('push_tokens').select('token').eq('user_id', userId);
    const expoTokens = (tokens || []).map((t: any) => t.token);
    if (expoTokens.length) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expoTokens.map((to: string) => ({
          to,
          title: 'Payment received',
          body: 'Your Nova subscription is active. Enjoy!',
          data: { type: 'payment_success', transaction_id: merchantRef },
          sound: 'default',
        }))),
      });
    }
  } catch {}

  // Send success email
  try {
    const { data: profile } = await supabaseAdmin.from('profiles').select('email, full_name').eq('id', userId).single();
    if (profile?.email) {
      await sendPaymentSuccessEmail(profile.email, profile.full_name || '', merchantRef, amount, currency);
    }
  } catch (e) {
    console.warn('[confirm][email][warn]', (e as any)?.message);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const orderTrackingId = (req.query.orderTrackingId as string) || (req.body?.orderTrackingId as string);
    if (!orderTrackingId) return res.status(400).json({ error: 'Missing orderTrackingId' });

    if (!supabaseAdmin) {
      return res.status(200).json({ ok: false, note: 'supabaseAdmin not configured - set SUPABASE_SERVICE_ROLE_KEY' });
    }

    await logEvent('confirm_start', { orderTrackingId });

    // 1. Get transaction status from PesaPal
    const status = await getTransactionStatus(orderTrackingId);
    const statusDesc = (status?.paymentStatusDescription || '').toString().toUpperCase();
    const merchantRef = status?.merchantReference || '';

    await logEvent('confirm_status', { orderTrackingId, merchantRef, statusDesc });

    if (!merchantRef) {
      return res.status(200).json({ ok: false, status: 'no_merchant_ref', statusDesc });
    }

    // 2. Find the payment record
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('id, user_id, amount, currency, status')
      .eq('transaction_id', merchantRef)
      .single();

    if (!payment) {
      // Payment row not found — try to find by gateway_status containing the orderTrackingId
      const { data: altPayment } = await supabaseAdmin
        .from('payments')
        .select('id, user_id, amount, currency, status, transaction_id')
        .contains('gateway_status', { orderTrackingId })
        .single();

      if (altPayment) {
        // Update transaction_id to match merchantRef for future lookups
        await supabaseAdmin.from('payments').update({ transaction_id: merchantRef }).eq('id', altPayment.id);
        return processPayment(altPayment as any, status, statusDesc, merchantRef, orderTrackingId, res);
      }

      await logEvent('confirm_payment_not_found', { orderTrackingId, merchantRef });
      return res.status(200).json({ ok: false, status: 'payment_not_found', merchantRef, statusDesc });
    }

    return processPayment(payment as any, status, statusDesc, merchantRef, orderTrackingId, res);
  } catch (e: any) {
    console.error('[confirm] error', e);
    await logEvent('confirm_error', { error: e?.message });
    return res.status(500).json({ error: e?.message || 'Confirm failed' });
  }
}

async function processPayment(
  payment: { id: string; user_id: string; amount: number; currency: string; status: string },
  status: any,
  statusDesc: string,
  merchantRef: string,
  orderTrackingId: string,
  res: NextApiResponse
) {
  // Already succeeded — idempotent return
  if (payment.status === 'succeeded') {
    return res.status(200).json({ ok: true, status: 'already_succeeded', statusDesc });
  }

  if (statusDesc.includes('COMPLETED') || statusDesc.includes('SUCCESS')) {
    // Update payment to succeeded
    const { error: pErr } = await supabaseAdmin!
      .from('payments')
      .update({ status: 'succeeded', gateway_status: status })
      .eq('id', payment.id);
    if (pErr) console.warn('[confirm][payment][update][warn]', pErr.message);

    // Activate subscription (+1 month default; could be improved with plan duration)
    if (payment.user_id) {
      await activateSubscription(payment.user_id, merchantRef, payment.amount || 0, payment.currency || 'RWF', 1);
    }

    await logEvent('confirm_success', { orderTrackingId, merchantRef, userId: payment.user_id });
    return res.status(200).json({ ok: true, status: 'succeeded', statusDesc });
  }

  if (statusDesc.includes('FAILED') || (statusDesc.includes('INVALID') && !JSON.stringify(status?.error || '').toLowerCase().includes('pending'))) {
    const { error: pErr } = await supabaseAdmin!
      .from('payments')
      .update({ status: 'failed', gateway_status: status })
      .eq('id', payment.id);
    if (pErr) console.warn('[confirm][payment][update][warn]', pErr.message);

    // Send failure email
    if (payment.user_id) {
      try {
        const { data: profile } = await supabaseAdmin!.from('profiles').select('email, full_name').eq('id', payment.user_id).single();
        if (profile?.email) {
          await sendPaymentFailedEmail(profile.email, profile.full_name || '', merchantRef, payment.amount || 0, payment.currency || 'RWF', statusDesc);
        }
      } catch {}
    }

    await logEvent('confirm_failed', { orderTrackingId, merchantRef });
    return res.status(200).json({ ok: true, status: 'failed', statusDesc });
  }

  // Still pending
  await logEvent('confirm_pending', { orderTrackingId, merchantRef, statusDesc });
  return res.status(200).json({ ok: true, status: 'pending', statusDesc });
}
