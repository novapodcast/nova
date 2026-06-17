import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendPush } from '../../../lib/notify';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseAdmin) return res.status(200).json({ ok: true, note: 'no-admin-client' });

  const since = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  const { data: pendings } = await supabaseAdmin
    .from('payments')
    .select('user_id, transaction_id, created_at')
    .eq('status', 'pending')
    .lte('created_at', since);

  if (!pendings?.length) return res.status(200).json({ ok: true, count: 0 });

  const userIds = pendings.map((p: any) => p.user_id);
  const { data: tokens } = await supabaseAdmin
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', userIds);

  const grouped: Record<string, string[]> = {};
  tokens?.forEach((t: any) => {
    grouped[t.user_id] = grouped[t.user_id] || [];
    grouped[t.user_id].push(t.token);
  });

  for (const p of pendings) {
    await sendPush(grouped[p.user_id] || [], {
      title: 'Complete your payment',
      body: 'Tap to resume checkout and finalize your subscription.',
      data: { type: 'payment_reminder', transaction_id: p.transaction_id },
    });
  }
  try { await supabaseAdmin.from('webhook_events').insert({ provider: 'ops', type: 'cron_payment_reminders_sent', payload: { count: pendings.length } }); } catch {}
  res.status(200).json({ ok: true, count: pendings.length });
}
