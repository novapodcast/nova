import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendPush, sendSubscriptionExpiringEmail } from '../../../lib/notify';

const REMINDER_DAYS = [7, 3, 1];

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

async function recordReminderSent(userId: string, reminderType: string, daysUntilExpiry: number) {
  if (!supabaseAdmin) return;
  const idempotencyKey = `subscription_reminder:${userId}:${reminderType}`;
  try {
    await supabaseAdmin.from('webhook_events').insert({
      provider: 'ops',
      type: 'subscription_reminder_sent',
      payload: { idempotencyKey, userId, reminderType, daysUntilExpiry, sentAt: new Date().toISOString() },
    });
  } catch {}
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseAdmin) return res.status(200).json({ ok: true, note: 'no-admin-client' });

  const now = new Date();
  const maxHorizon = new Date(now.getTime());
  maxHorizon.setDate(maxHorizon.getDate() + 7);
  maxHorizon.setHours(23, 59, 59, 999);

  const { data: subs } = await supabaseAdmin
    .from('user_subscriptions')
    .select('user_id, expires_at, status')
    .eq('status', 'active')
    .lte('expires_at', maxHorizon.toISOString())
    .gt('expires_at', now.toISOString());

  if (!subs?.length) return res.status(200).json({ ok: true, count: 0, sent: 0 });

  const userIds = subs.map((s: any) => s.user_id);
  const { data: tokens } = await supabaseAdmin
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', userIds);

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds);

  const groupedTokens: Record<string, string[]> = {};
  tokens?.forEach((t: any) => {
    groupedTokens[t.user_id] = groupedTokens[t.user_id] || [];
    groupedTokens[t.user_id].push(t.token);
  });

  const profileMap: Record<string, any> = {};
  profiles?.forEach((p: any) => { profileMap[p.id] = p; });

  let sent = 0;
  for (const s of subs) {
    const userId = (s as any).user_id;
    const expiresAt = new Date((s as any).expires_at);
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    for (const targetDays of REMINDER_DAYS) {
      if (daysUntilExpiry !== targetDays) continue;

      const reminderType = `expiry_${targetDays}d`;
      if (await isReminderAlreadySent(userId, reminderType)) continue;

      const pushTokens = groupedTokens[userId] || [];
      if (pushTokens.length) {
        await sendPush(pushTokens, {
          title: 'Subscription expiring soon',
          body: `Your subscription expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}. Renew now to keep listening.`,
          data: { type: 'subscription_expiry', daysUntilExpiry },
        });
      }

      const profile = profileMap[userId];
      if (profile?.email) {
        try {
          await sendSubscriptionExpiringEmail(profile.email, profile.full_name || '', daysUntilExpiry);
        } catch {}
      }

      await recordReminderSent(userId, reminderType, daysUntilExpiry);
      sent++;
    }
  }

  try {
    await supabaseAdmin.from('webhook_events').insert({
      provider: 'ops',
      type: 'cron_subscription_expiry_run',
      payload: { candidates: subs.length, sent, runAt: now.toISOString() },
    });
  } catch {}

  res.status(200).json({ ok: true, candidates: subs.length, sent });
}
