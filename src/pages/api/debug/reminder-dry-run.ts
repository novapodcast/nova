import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdmin } from '../../../lib/auth/admin';

const REMINDER_DAYS = [7, 3, 1];

async function isReminderAlreadySent(userId: string, reminderType: string): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const idempotencyKey = `subscription_reminder:${userId}:${reminderType}`;
  const { data } = await supabaseAdmin
    .from('webhook_events')
    .select('id, created_at')
    .eq('provider', 'ops')
    .eq('type', 'subscription_reminder_sent')
    .contains('payload', { idempotencyKey })
    .limit(1);
  return !!(data && data.length > 0);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabaseAdmin) return res.status(500).json({ error: 'Server not configured' });

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  const { isAdmin } = await verifyAdmin(token);
  if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });

  const dryRun = req.query.dryRun !== 'false';
  const now = new Date();

  // --- Expiry reminders (7/3/1 day) ---
  const maxHorizon = new Date(now.getTime());
  maxHorizon.setDate(maxHorizon.getDate() + 7);
  maxHorizon.setHours(23, 59, 59, 999);

  const { data: activeSubs } = await supabaseAdmin
    .from('user_subscriptions')
    .select('user_id, expires_at, status')
    .eq('status', 'active')
    .lte('expires_at', maxHorizon.toISOString())
    .gt('expires_at', now.toISOString());

  const expiryResults: any[] = [];
  for (const s of activeSubs || []) {
    const userId = (s as any).user_id;
    const expiresAt = new Date((s as any).expires_at);
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    for (const targetDays of REMINDER_DAYS) {
      if (daysUntilExpiry !== targetDays) continue;
      const reminderType = `expiry_${targetDays}d`;
      const alreadySent = await isReminderAlreadySent(userId, reminderType);
      expiryResults.push({
        userId,
        expiresAt: expiresAt.toISOString(),
        daysUntilExpiry,
        reminderType,
        eligible: true,
        alreadySent,
        wouldSend: dryRun ? !alreadySent : false,
        idempotencyKey: `subscription_reminder:${userId}:${reminderType}`,
      });
    }
  }

  // --- Post-expiry renewal reminders ---
  const since = new Date(now.getTime());
  since.setDate(since.getDate() - 3);

  const { data: expiredSubs } = await supabaseAdmin
    .from('user_subscriptions')
    .select('user_id, expires_at, status')
    .eq('status', 'expired')
    .gte('expires_at', since.toISOString());

  const renewalResults: any[] = [];
  for (const s of expiredSubs || []) {
    const userId = (s as any).user_id;
    const reminderType = 'post_expiry_renewal';
    const alreadySent = await isReminderAlreadySent(userId, reminderType);
    renewalResults.push({
      userId,
      expiresAt: (s as any).expires_at,
      reminderType,
      eligible: true,
      alreadySent,
      wouldSend: dryRun ? !alreadySent : false,
      idempotencyKey: `subscription_reminder:${userId}:${reminderType}`,
    });
  }

  // --- Expiry cron preview ---
  const { data: toExpire } = await supabaseAdmin
    .from('user_subscriptions')
    .select('id, user_id, expires_at, status')
    .eq('status', 'active')
    .lte('expires_at', now.toISOString());

  const expiryCronPreview = (toExpire || []).map((s: any) => ({
    id: s.id,
    userId: s.user_id,
    expiresAt: s.expires_at,
    currentStatus: s.status,
    willBecome: 'expired',
  }));

  // --- Recent cron execution logs ---
  const { data: cronLogs } = await supabaseAdmin
    .from('webhook_events')
    .select('id, provider, type, payload, created_at')
    .in('type', [
      'cron_expire_subscriptions',
      'cron_subscription_expiry_run',
      'cron_renewal_reminders_sent',
    ])
    .order('created_at', { ascending: false })
    .limit(10);

  return res.status(200).json({
    mode: dryRun ? 'dry-run' : 'live',
    timestamp: now.toISOString(),
    expiryReminders: {
      scanned: activeSubs?.length || 0,
      eligible: expiryResults.length,
      results: expiryResults,
    },
    renewalReminders: {
      scanned: expiredSubs?.length || 0,
      eligible: renewalResults.length,
      results: renewalResults,
    },
    expiryCron: {
      subscriptionsToExpire: expiryCronPreview.length,
      results: expiryCronPreview,
    },
    recentCronLogs: cronLogs || [],
  });
}
