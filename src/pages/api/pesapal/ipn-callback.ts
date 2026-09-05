import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getTransactionStatus } from '../../../lib/pesapal';
import { logPaymentEvent } from '../../../lib/paymentLog';
import { findOrCreatePayment, processCompletedPayment, processFailedPayment } from '../../../lib/paymentProcessing';
import { activateOrExtendSubscription } from '../../../lib/subscriptions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const method = req.method || 'GET';
    const payload = method === 'POST' ? req.body : req.query;

    const orderTrackingId = (payload as any).orderTrackingId || (payload as any).OrderTrackingId;
    await logPaymentEvent('ipn_received', { method, orderTrackingId });

    if (!supabaseAdmin) return res.status(200).json({ ok: true, note: 'no-admin-client' });

    let statusDesc = (payload as any).paymentStatusDescription || (payload as any).status || '';
    let merchantRef = (payload as any).merchantReference || '';

    if (orderTrackingId) {
      try {
        const status = await getTransactionStatus(orderTrackingId.toString());
        statusDesc = status?.paymentStatusDescription || statusDesc;
        merchantRef = status?.merchantReference || merchantRef;
        await logPaymentEvent('ipn_status_fetched', { orderTrackingId, merchantRef, statusDesc });
      } catch (e) {
        await logPaymentEvent('ipn_status_fetch_error', { orderTrackingId, error: (e as any)?.message });
      }
    }

    const upperStatus = statusDesc?.toString().toUpperCase();

    if (upperStatus?.includes('COMPLETED')) {
      const status = await getTransactionStatus(orderTrackingId.toString()).catch(() => null);
      if (!status || !merchantRef) {
        await logPaymentEvent('ipn_error', { reason: 'cannot_fetch_status', orderTrackingId });
        return res.status(200).json({ ok: false, error: 'Cannot verify transaction status' });
      }

      const payment = await findOrCreatePayment(status as any, 'ipn');
      if (!payment) {
        await logPaymentEvent('ipn_recovery_failed', { merchantRef, orderTrackingId });
        return res.status(200).json({ ok: false, status: 'payment_not_found' });
      }

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
            await activateOrExtendSubscription(payment.user_id, payment.amount || 0);
            await logPaymentEvent('ipn_reactivation', { merchantRef, orderTrackingId, userId: payment.user_id });
          }
        }
        await logPaymentEvent('ipn_duplicate', { merchantRef, orderTrackingId });
        return res.status(200).json({ ok: true, duplicate: true });
      }

      const result = await processCompletedPayment(payment, status as any, 'ipn');
      await logPaymentEvent('ipn_processed_success', { merchantRef, orderTrackingId, subscriptionActivated: result.subscriptionActivated });
    } else if (upperStatus?.includes('FAILED')) {
      const status = await getTransactionStatus(orderTrackingId.toString()).catch(() => null);
      if (status && merchantRef) {
        const payment = await findOrCreatePayment(status as any, 'ipn');
        if (payment) {
          await processFailedPayment(payment, status as any, 'ipn');
        }
      }
      await logPaymentEvent('ipn_processed_failed', { merchantRef, orderTrackingId });
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('[ipn-callback] error', e);
    await logPaymentEvent('ipn_error', { error: e?.message });
    return res.status(500).json({ error: e?.message || 'IPN error' });
  }
}
