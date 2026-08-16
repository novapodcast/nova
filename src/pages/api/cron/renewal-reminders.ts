import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendPush } from '../../../lib/notify';

async function isReminderAlreadySent(userId: string, reminderType: string): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const idempotencyKey = `subscription_reminder:${userId}:${reminderType}`;
  const { data } = await supabaseAdmin
    .from('webhook_events')
    .select('id')
    .eq('provider', 'ops')
    .eq('type', 'subscription_reminder_sent')
    .contains('payload', { idempotencyKey })
    .limit(1);
  return !!(data && data.length > 0);
}

async function recordReminderSent(userId: string, reminderType: string) {
  if (!supabaseAdmin) return;
  const idempotencyKey = `subscription_reminder:${userId}:${reminderType}`;
  try {
    await supabaseAdmin.from('webhook_events').insert({
      provider: 'ops',
      type: 'subscription_reminder_sent',
      payload: { idempotencyKey, userId, reminderType, sentAt: new Date().toISOString() },
    });
  } catch {}
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseAdmin) return res.status(200).json({ ok: true, note: 'no-admin-client' });

  const now = new Date();
  const since = new Date(now.getTime());
  since.setDate(since.getDate() - 3);

  const { data: subs } = await supabaseAdmin
    .from('user_subscriptions')
    .select('user_id, expires_at, status')
    .eq('status', 'expired')
    .gte('expires_at', since.toISOString());

  if (!subs?.length) return res.status(200).json({ ok: true, count: 0, sent: 0 });

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

  let sent = 0;
  for (const s of subs) {
    const userId = (s as any).user_id;
    const reminderType = 'post_expiry_renewal';
    if (await isReminderAlreadySent(userId, reminderType)) continue;

    await sendPush(grouped[userId] || [], {
      title: 'Renew your subscription',
      body: 'Get back to your favorite shows with a quick renewal.',
      data: { type: 'renewal_reminder' },
    });

    await recordReminderSent(userId, reminderType);
    sent++;
  }

  try { await supabaseAdmin.from('webhook_events').insert({ provider: 'ops', type: 'cron_renewal_reminders_sent', payload: { candidates: subs.length, sent } }); } catch {}
  res.status(200).json({ ok: true, candidates: subs.length, sent });
}
