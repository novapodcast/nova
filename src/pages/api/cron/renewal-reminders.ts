import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendPush } from '../../../lib/notify';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseAdmin) return res.status(200).json({ ok: true, note: 'no-admin-client' });

  // Remind users whose subscription expired in last 3 days
  const now = new Date();
  const since = new Date(now.getTime());
  since.setDate(since.getDate() - 3);

  const { data: subs } = await supabaseAdmin
    .from('user_subscriptions')
    .select('user_id, expires_at, status')
    .eq('status', 'expired')
    .gte('expires_at', since.toISOString());

  if (!subs?.length) return res.status(200).json({ ok: true, count: 0 });

  const userIds = subs.map((s: any) => s.user_id);
  const { data: tokens } = await supabaseAdmin
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', userIds);

  const grouped: Record<string, string[]> = {};
  tokens?.forEach((t: any) => {
    grouped[t.user_id] = grouped[t.user_id] || [];
    grouped[t.user_id].push(t.token);
  });

  for (const s of subs) {
    await sendPush(grouped[s.user_id] || [], {
      title: 'Renew your subscription',
      body: 'Get back to your favorite shows with a quick renewal.',
      data: { type: 'renewal_reminder' },
    });
  }
  try { await supabaseAdmin.from('webhook_events').insert({ provider: 'ops', type: 'cron_renewal_reminders_sent', payload: { count: subs.length } }); } catch {}
  res.status(200).json({ ok: true, count: subs.length });
}
