import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { supabase as supabasePublic } from '../../../lib/supabaseClient';

function isoOrNull(d?: string | null): string | null {
  if (!d) return null;
  try { return new Date(d).toISOString(); } catch { return null; }
}

function getMode() {
  const hasAdmin = !!supabaseAdmin;
  const hasPublic = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (hasAdmin) return 'FULL' as const;
  if (hasPublic) return 'DEMO' as const;
  return 'SAFE' as const;
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const now = new Date().toISOString();
  const mode = getMode();

  // Database connectivity
  let dbOk = false;
  let dbMode: 'admin' | 'anon' | 'none' = 'none';
  try {
    if (supabaseAdmin) {
      dbMode = 'admin';
      const { error } = await supabaseAdmin.from('payments').select('id').limit(1);
      dbOk = !error;
    } else {
      dbMode = 'anon';
      const { error } = await supabasePublic.from('payments').select('id').limit(1);
      dbOk = !error;
    }
  } catch {
    dbOk = false;
  }

  // Last payment processed
  let lastPaymentAt: string | null = null;
  let latestPaymentUser: string | null = null;
  if (supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin
        .from('payments')
        .select('user_id, completed_at, updated_at, created_at, status')
        .eq('status', 'succeeded')
        .order('updated_at', { ascending: false })
        .limit(1);
      if (data && data.length) {
        const p: any = data[0];
        lastPaymentAt = isoOrNull(p.completed_at) || isoOrNull(p.updated_at) || isoOrNull(p.created_at);
        latestPaymentUser = p.user_id || null;
      }
    } catch {}
  }

  // Last IPN received timestamp
  let lastIpnAt: string | null = null;
  if (supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin
        .from('webhook_events')
        .select('created_at')
        .eq('provider', 'pesapal')
        .order('created_at', { ascending: false })
        .limit(1);
      lastIpnAt = data && data.length ? isoOrNull((data[0] as any).created_at) : null;
    } catch {}
  }

  // Last reconciliation run timestamp
  let lastReconAt: string | null = null;
  if (supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin
        .from('webhook_events')
        .select('created_at')
        .eq('provider', 'cron')
        .eq('type', 'reconcile_run')
        .order('created_at', { ascending: false })
        .limit(1);
      lastReconAt = data && data.length ? isoOrNull((data[0] as any).created_at) : null;
    } catch {}
  }

  // Analytics status
  let analyticsStatus: 'ok' | 'fallback' | 'degraded' = 'degraded';
  let lastAnalyticsAt: string | null = null;
  try {
    if (supabaseAdmin) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabaseAdmin
        .from('analytics_events')
        .select('ts')
        .gte('ts', since)
        .order('ts', { ascending: false })
        .limit(1);
      if (data && data.length) {
        analyticsStatus = 'ok';
        lastAnalyticsAt = isoOrNull((data[0] as any).ts);
      } else {
        analyticsStatus = 'ok'; // Admin present but no recent events; still operational
      }
    } else if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      analyticsStatus = 'fallback';
    } else {
      analyticsStatus = 'degraded';
    }
  } catch {
    analyticsStatus = 'degraded';
  }

  // Subscription sync status (based on latest succeeded payment)
  let subscriptionStatus: 'ok' | 'out_of_sync' | 'unknown' = 'unknown';
  if (supabaseAdmin && latestPaymentUser) {
    try {
      const { data: sub } = await supabaseAdmin
        .from('user_subscriptions')
        .select('expires_at')
        .eq('user_id', latestPaymentUser)
        .single();
      if (sub?.expires_at) {
        const exp = new Date(sub.expires_at as any);
        subscriptionStatus = exp.getTime() > Date.now() ? 'ok' : 'out_of_sync';
      } else {
        subscriptionStatus = 'out_of_sync';
      }
    } catch {
      subscriptionStatus = 'unknown';
    }
  }

  const payload = {
    timestamp: now,
    mode,
    db: { ok: dbOk, mode: dbMode },
    payments: { lastProcessedAt: lastPaymentAt },
    ipn: { lastReceivedAt: lastIpnAt },
    reconciliation: { lastRunAt: lastReconAt },
    analytics: { status: analyticsStatus, lastEventAt: lastAnalyticsAt },
    subscriptions: { status: subscriptionStatus },
  } as const;

  res.status(200).json(payload);
}
