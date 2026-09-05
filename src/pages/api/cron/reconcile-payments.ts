import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getTransactionStatus } from '../../../lib/pesapal';
import { logPaymentEvent } from '../../../lib/paymentLog';
import { processCompletedPayment, processFailedPayment } from '../../../lib/paymentProcessing';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Vercel cron authentication: verify CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (!supabaseAdmin) return res.status(200).json({ ok: true, note: 'no-admin-client' });

  const runStartedAt = new Date().toISOString();
  await logPaymentEvent('reconciliation_started', { runStartedAt });

  // 1. Find pending payments older than 10 minutes and reconcile status
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: pendings } = await supabaseAdmin
    .from('payments')
    .select('id, transaction_id, order_tracking_id, user_id, amount, currency')
    .eq('status', 'pending')
    .lte('created_at', since);

  let updated = 0;
  let recovered = 0;
  let errors = 0;

  for (const p of pendings || []) {
    try {
      const orderTrackingId = (p as any).order_tracking_id;
      if (!orderTrackingId) {
        await logPaymentEvent('reconciliation_skipped', { paymentId: p.id, reason: 'no_order_tracking_id' });
        continue;
      }
      const status = await getTransactionStatus(orderTrackingId);
      const statusDesc = (status?.paymentStatusDescription || '').toString().toUpperCase();

      if (statusDesc.includes('COMPLETED')) {
        const result = await processCompletedPayment(p as any, status as any, 'reconcile');
        if (result.ok) updated++;
        if (result.subscriptionActivated) recovered++;
      } else if (statusDesc.includes('FAILED')) {
        await processFailedPayment(p as any, status as any, 'reconcile');
        updated++;
      }
    } catch (e) {
      errors++;
      await logPaymentEvent('reconciliation_error', { paymentId: p.id, error: (e as any)?.message });
    }
  }

  const runEndedAt = new Date().toISOString();
  await logPaymentEvent('reconciliation_completed', {
    pendingCount: pendings?.length || 0,
    updated,
    recovered,
    errors,
    runStartedAt,
    runEndedAt,
  });

  res.status(200).json({ ok: true, pending: pendings?.length || 0, updated, recovered, errors });
}
