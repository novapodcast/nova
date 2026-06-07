import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getTransactionStatus } from '../../../lib/pesapal';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseAdmin) return res.status(200).json({ ok: true, note: 'no-admin-client' });

  // Find pending payments older than 10 minutes and reconcile status
  const runStartedAt = new Date().toISOString();
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: pendings } = await supabaseAdmin
    .from('payments')
    .select('id, transaction_id, gateway_status, user_id, amount, currency')
    .eq('status', 'pending')
    .lte('created_at', since);

  if (!pendings?.length) return res.status(200).json({ ok: true, count: 0 });

  let updated = 0;
  for (const p of pendings) {
    try {
      const orderTrackingId = (p as any)?.gateway_status?.orderTrackingId;
      if (!orderTrackingId) continue;
      const status = await getTransactionStatus(orderTrackingId);
      const statusDesc = (status?.paymentStatusDescription || '').toString().toUpperCase();
      if (statusDesc.includes('COMPLETED')) {
        await supabaseAdmin.from('payments').update({ status: 'succeeded', gateway_status: status }).eq('id', p.id);
        // Extend/create subscription (+1 month) and write billing history similar to IPN
        const userId = (p as any).user_id as string | null;
        if (userId) {
          const { data: current } = await supabaseAdmin
            .from('user_subscriptions')
            .select('id, expires_at')
            .eq('user_id', userId)
            .single();
          const base = current?.expires_at ? new Date(current.expires_at) : new Date();
          const next = new Date(base.getTime());
          next.setMonth(next.getMonth() + 1);
          const upsert = { user_id: userId, status: 'active', expires_at: next.toISOString() } as any;
          if (current?.id) upsert.id = current.id;
          await supabaseAdmin.from('user_subscriptions').upsert(upsert).select().single();

          await supabaseAdmin.from('billing_history').insert({
            user_id: userId,
            transaction_id: (p as any).transaction_id,
            amount: (p as any).amount || 0,
            currency: (p as any).currency || 'RWF',
            description: 'Subscription payment (reconciled)',
          });
        }
        updated++;
      } else if (statusDesc.includes('FAILED')) {
        await supabaseAdmin.from('payments').update({ status: 'failed', gateway_status: status }).eq('id', p.id);
        updated++;
      }
    } catch (e) {
      // continue
    }
  }

  const runEndedAt = new Date().toISOString();
  // Observability: log reconciliation run (non-critical)
  try {
    await supabaseAdmin.from('webhook_events').insert({
      provider: 'cron',
      type: 'reconcile_run',
      payload: { count: pendings.length, updated, runStartedAt, runEndedAt },
    });
  } catch {}

  res.status(200).json({ ok: true, count: pendings.length, updated });
}
