import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getTransactionStatus } from '../../../lib/pesapal';
import { sendPush, sendPaymentSuccessEmail, sendPaymentFailedEmail } from '../../../lib/notify';
import { activateOrExtendSubscription } from '../../../lib/subscriptions';

async function logEvent(type: string, payload: any) {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from('webhook_events').insert({ provider: 'pesapal', type, payload });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const method = req.method || 'GET';
    const payload = method === 'POST' ? req.body : req.query;

    // Pesapal may send orderTrackingId or similar identifiers
    const orderTrackingId = (payload as any).orderTrackingId || (payload as any).OrderTrackingId;
    await logEvent('ipn_received', { method, payload });

    if (!supabaseAdmin) return res.status(200).json({ ok: true, note: 'no-admin-client' });

    // Optionally, fetch status from Pesapal via our status API (client-side can also do this)
    // Here we update payment + subscription upon success
    let statusDesc = (payload as any).paymentStatusDescription || (payload as any).status || '';
    let merchantRef = (payload as any).merchantReference || '';

    if (orderTrackingId) {
      try {
        const status = await getTransactionStatus(orderTrackingId.toString());
        statusDesc = status?.paymentStatusDescription || statusDesc;
        merchantRef = status?.merchantReference || merchantRef;
        await logEvent('ipn_status_fetched', { orderTrackingId, status });
      } catch (e) {
        await logEvent('ipn_status_fetch_error', { orderTrackingId, error: (e as any)?.message });
      }
    }

    const upperStatus = statusDesc?.toString().toUpperCase();

    // Helper: find payment by merchantRef, fallback to orderTrackingId in gateway_status
    const findPayment = async () => {
      if (merchantRef) {
        const { data } = await supabaseAdmin!
          .from('payments')
          .select('id, user_id, status, amount, currency, transaction_id')
          .eq('transaction_id', merchantRef)
          .single();
        if (data) return data as any;
      }
      // Fallback: search by orderTrackingId in gateway_status JSON
      if (orderTrackingId) {
        const { data } = await supabaseAdmin!
          .from('payments')
          .select('id, user_id, status, amount, currency, transaction_id')
          .contains('gateway_status', { orderTrackingId: orderTrackingId.toString() })
          .single();
        if (data) {
          // Fix transaction_id for future lookups
          if (merchantRef && data.transaction_id !== merchantRef) {
            await supabaseAdmin!.from('payments').update({ transaction_id: merchantRef }).eq('id', data.id);
          }
          return data as any;
        }
      }
      return null;
    };

    if (upperStatus?.includes('COMPLETED')) {
      const existing = await findPayment();
      if (existing?.status === 'succeeded') {
        await logEvent('ipn_duplicate', { merchantRef, orderTrackingId });
        return res.status(200).json({ ok: true, duplicate: true });
      }

      if (existing) {
        // Mark payment succeeded
        const { error: pErr } = await supabaseAdmin
          .from('payments')
          .update({ status: 'succeeded', gateway_status: payload })
          .eq('id', existing.id);
        if (pErr) console.warn('[payments][update][warn]', pErr.message);

        const userId = existing.user_id;
        if (userId) {
          // Activate subscription with plan_id
          await activateOrExtendSubscription(userId, existing.amount || 0, 1);

          // Billing history (idempotent)
          const { data: existingBilling } = await supabaseAdmin.from('billing_history').select('id').eq('transaction_id', merchantRef).limit(1);
          if (!existingBilling || existingBilling.length === 0) {
            await supabaseAdmin.from('billing_history').insert({
              user_id: userId,
              transaction_id: merchantRef,
              amount: existing.amount || 0,
              currency: existing.currency || 'RWF',
              description: 'Subscription payment',
            });
          }

          // Success notifications
          try {
            const { data: tokens } = await supabaseAdmin.from('push_tokens').select('token').eq('user_id', userId);
            const expoTokens = (tokens || []).map((t: any) => t.token);
            await sendPush(expoTokens, { title: 'Payment received', body: 'Your Nova subscription is active. Enjoy!', data: { type: 'payment_success', transaction_id: merchantRef } });
          } catch {}

          try {
            const { data: profile } = await supabaseAdmin.from('profiles').select('email, full_name').eq('id', userId).single();
            const to = profile?.email || '';
            const userName = profile?.full_name || '';
            if (to) {
              await sendPaymentSuccessEmail(to, userName, merchantRef, existing.amount || 0, existing.currency || 'RWF');
            }
          } catch {}
        }
      }
      await logEvent('ipn_processed_success', { merchantRef, orderTrackingId, paymentFound: !!existing });
    } else if (upperStatus?.includes('FAILED')) {
      const existing = await findPayment();
      if (existing) {
        const { error: pErr } = await supabaseAdmin
          .from('payments')
          .update({ status: 'failed', gateway_status: payload })
          .eq('id', existing.id);
        if (pErr) console.warn('[payments][update][warn]', pErr.message);

        // Send failure email
        try {
          const userId = existing.user_id;
          if (userId) {
            const { data: profile } = await supabaseAdmin.from('profiles').select('email, full_name').eq('id', userId).single();
            const to = profile?.email || '';
            const userName = profile?.full_name || '';
            if (to) {
              await sendPaymentFailedEmail(to, userName, merchantRef, existing.amount || 0, existing.currency || 'RWF', statusDesc);
            }
          }
        } catch {}
      }

      await logEvent('ipn_processed_failed', { merchantRef, orderTrackingId, paymentFound: !!existing });
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('[ipn-callback] error', e);
    return res.status(500).json({ error: e?.message || 'IPN error' });
  }
}
