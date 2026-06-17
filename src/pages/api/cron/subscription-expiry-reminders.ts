import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendPush } from '../../../lib/notify';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseAdmin) return res.status(200).json({ ok: true, note: 'no-admin-client' });
  const now = new Date();
  const horizon = new Date(now.getTime());
  horizon.setDate(horizon.getDate() + 3);

  const { data: subs } = await supabaseAdmin
    .from('user_subscriptions')
    .select('user_id, expires_at')
    .eq('status', 'active')
    .lte('expires_at', horizon.toISOString());

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
    const ttl = Math.max(0, Math.ceil((new Date(s.expires_at).getTime() - now.getTime()) / (24*3600*1000)));
    await sendPush(grouped[s.user_id] || [], {
      title: 'Subscription expiring soon',
      body: `Your subscription expires in ${ttl} day(s). Renew now to keep listening.`,
      data: { type: 'subscription_expiry' },
    });
  }
  try { await supabaseAdmin.from('webhook_events').insert({ provider: 'ops', type: 'cron_subscription_expiry_sent', payload: { count: subs.length } }); } catch {}
  res.status(200).json({ ok: true, count: subs.length });
}
