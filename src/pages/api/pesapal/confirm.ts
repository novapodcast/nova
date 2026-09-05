import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getTransactionStatus } from '../../../lib/pesapal';
import { logPaymentEvent } from '../../../lib/paymentLog';
import { findOrCreatePayment, processCompletedPayment, processFailedPayment } from '../../../lib/paymentProcessing';
import { activateOrExtendSubscription } from '../../../lib/subscriptions';
import { sendSubscriptionRenewedEmail } from '../../../lib/notify';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const orderTrackingId = (req.query.orderTrackingId as string) || (req.body?.orderTrackingId as string);
    if (!orderTrackingId) return res.status(400).json({ error: 'Missing orderTrackingId' });

    if (!supabaseAdmin) {
      return res.status(500).json({ ok: false, error: 'supabaseAdmin not configured' });
    }

    await logPaymentEvent('confirm_started', { orderTrackingId });

    // 1. Get transaction status from Pesapal
    const status = await getTransactionStatus(orderTrackingId);
    const statusDesc = (status?.paymentStatusDescription || '').toString().toUpperCase();
    const merchantRef = status?.merchantReference || '';

    await logPaymentEvent('confirm_status_received', { orderTrackingId, merchantRef, statusDesc });

    if (!merchantRef) {
      return res.status(200).json({ ok: false, status: 'no_merchant_ref', statusDesc });
    }

    // 2. Find or recover the payment record
    const payment = await findOrCreatePayment(status as any, 'confirm');

    if (!payment) {
      await logPaymentEvent('confirm_recovery_failed', { orderTrackingId, merchantRef, statusDesc });
      return res.status(200).json({ ok: false, status: 'payment_not_found', merchantRef, statusDesc });
    }

    // 3. Already succeeded — verify subscription, re-activate if expired
    if (payment.status === 'succeeded') {
      if (payment.user_id) {
        const { data: sub } = await supabaseAdmin
          .from('user_subscriptions')
          .select('id, status, expires_at')
          .eq('user_id', payment.user_id)
          .order('updated_at', { ascending: false })
          .limit(1);
        const subRow = sub && sub.length > 0 ? sub[0] as any : null;
        const isExpired = !subRow || subRow.status === 'expired' ||
          (subRow.expires_at && new Date(subRow.expires_at) <= new Date());
        if (isExpired) {
          const newSub = await activateOrExtendSubscription(payment.user_id, payment.amount || 0);
          await logPaymentEvent('confirm_reactivation', {
            orderTrackingId, merchantRef, userId: payment.user_id,
            activated: !!newSub, expires_at: newSub?.expires_at || null,
          });
        }
      }
      return res.status(200).json({ ok: true, status: 'already_succeeded', statusDesc });
    }

    // 4. Process based on Pesapal status
    if (statusDesc.includes('COMPLETED') || statusDesc.includes('SUCCESS')) {
      const result = await processCompletedPayment(payment, status as any, 'confirm');

      if (payment.user_id && result.subscriptionActivated) {
        try {
          const { data: profile } = await supabaseAdmin.from('profiles').select('email, full_name').eq('id', payment.user_id).single();
          if (profile?.email) {
            const { data: sub } = await supabaseAdmin
              .from('user_subscriptions')
              .select('expires_at')
              .eq('user_id', payment.user_id)
              .order('updated_at', { ascending: false })
              .limit(1)
              .single();
            if (sub?.expires_at) {
              await sendSubscriptionRenewedEmail(profile.email, profile.full_name || '', new Date(sub.expires_at));
            }
          }
        } catch {}
      }

      if (!result.subscriptionActivated && payment.user_id) {
        return res.status(200).json({ ok: false, status: 'payment_succeeded_activation_failed', statusDesc });
      }
      return res.status(200).json({ ok: true, status: 'succeeded', statusDesc });
    }

    if (statusDesc.includes('FAILED') || (statusDesc.includes('INVALID') && !JSON.stringify(status?.error || '').toLowerCase().includes('pending'))) {
      await processFailedPayment(payment, status as any, 'confirm');
      return res.status(200).json({ ok: true, status: 'failed', statusDesc, description: status?.raw?.description || null });
    }

    // Still pending
    await logPaymentEvent('confirm_pending', { orderTrackingId, merchantRef, statusDesc });
    return res.status(200).json({ ok: true, status: 'pending', statusDesc });
  } catch (e: any) {
    console.error('[confirm] error', e);
    await logPaymentEvent('confirm_error', { error: e?.message });
    return res.status(500).json({ error: e?.message || 'Confirm failed' });
  }
}
