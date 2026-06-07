import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getTransactionStatus } from '../../../lib/pesapal';
import { sendPush, sendPaymentSuccessEmail, sendPaymentFailedEmail } from '../../../lib/notify';

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

    if (statusDesc?.toString().toUpperCase().includes('COMPLETED')) {
      // Idempotency: if already succeeded, skip
      const { data: existing } = await supabaseAdmin
        .from('payments')
        .select('id, user_id, status, amount, currency')
        .eq('transaction_id', merchantRef)
        .single();
      if (existing?.status === 'succeeded') {
        await logEvent('ipn_duplicate', { merchantRef, orderTrackingId });
        return res.status(200).json({ ok: true, duplicate: true });
      }

      // Mark payment succeeded
      const { error: pErr } = await supabaseAdmin
        .from('payments')
        .update({ status: 'succeeded', gateway_status: payload })
        .eq('transaction_id', merchantRef);
      if (pErr) console.warn('[payments][update][warn]', pErr.message);

      // Extend/create subscription (example: +30 days)
      const { data: payment } = await supabaseAdmin
        .from('payments')
        .select('user_id, amount, currency')
        .eq('transaction_id', merchantRef)
        .single();

      const userId = payment?.user_id;
      if (userId) {
        const { data: current } = await supabaseAdmin
          .from('user_subscriptions')
          .select('id, expires_at')
          .eq('user_id', userId)
          .single();
        const base = current?.expires_at ? new Date(current.expires_at) : new Date();
        const next = new Date(base.getTime());
        next.setMonth(next.getMonth() + 1);
        const upsert = {
          user_id: userId,
          status: 'active',
          expires_at: next.toISOString(),
        } as any;
        if (current?.id) upsert.id = current.id;
        const { error: sErr } = await supabaseAdmin.from('user_subscriptions').upsert(upsert).select().single();
        if (sErr) console.warn('[subscriptions][upsert][warn]', sErr.message);

        // Billing history
        await supabaseAdmin.from('billing_history').insert({
          user_id: userId,
          transaction_id: merchantRef,
          amount: payment?.amount || 0,
          currency: payment?.currency || 'RWF',
          description: 'Subscription payment',
        });

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
            await sendPaymentSuccessEmail(to, userName, merchantRef, payment?.amount || 0, payment?.currency || 'RWF');
          }
        } catch {}
      }
      await logEvent('ipn_processed_success', { merchantRef, orderTrackingId });
    } else if (statusDesc?.toString().toUpperCase().includes('FAILED')) {
      const { error: pErr } = await supabaseAdmin
        .from('payments')
        .update({ status: 'failed', gateway_status: payload })
        .eq('transaction_id', merchantRef);
      if (pErr) console.warn('[payments][update][warn]', pErr.message);

      // Send failure email
      try {
        const { data: payment } = await supabaseAdmin.from('payments').select('user_id, amount, currency').eq('transaction_id', merchantRef).single();
        const userId = payment?.user_id;
        if (userId) {
          const { data: profile } = await supabaseAdmin.from('profiles').select('email, full_name').eq('id', userId).single();
          const to = profile?.email || '';
          const userName = profile?.full_name || '';
          if (to) {
            await sendPaymentFailedEmail(to, userName, merchantRef, payment?.amount || 0, payment?.currency || 'RWF', statusDesc);
          }
        }
      } catch {}

      await logEvent('ipn_processed_failed', { merchantRef, orderTrackingId });
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('[ipn-callback] error', e);
    return res.status(500).json({ error: e?.message || 'IPN error' });
  }
}
