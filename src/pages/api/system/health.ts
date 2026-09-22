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

  // Last IPN received timestamp — only actual IPN events (type starts with 'ipn_')
  let lastIpnAt: string | null = null;
  if (supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin
        .from('webhook_events')
        .select('created_at')
        .eq('provider', 'pesapal')
        .like('type', 'ipn_%')
        .order('created_at', { ascending: false })
        .limit(1);
      lastIpnAt = data && data.length ? isoOrNull((data[0] as any).created_at) : null;
    } catch {}
  }

  // Last confirm activity timestamp — only confirm events (type starts with 'confirm_')
  let lastConfirmAt: string | null = null;
  if (supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin
        .from('webhook_events')
        .select('created_at')
        .eq('provider', 'pesapal')
        .like('type', 'confirm_%')
        .order('created_at', { ascending: false })
        .limit(1);
      lastConfirmAt = data && data.length ? isoOrNull((data[0] as any).created_at) : null;
    } catch {}
  }

  // Last reconciliation run timestamp — only reconciliation events (type starts with 'reconciliation_')
  let lastReconAt: string | null = null;
  if (supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin
        .from('webhook_events')
        .select('created_at')
        .eq('provider', 'pesapal')
        .like('type', 'reconciliation_%')
        .order('created_at', { ascending: false })
        .limit(1);
      lastReconAt = data && data.length ? isoOrNull((data[0] as any).created_at) : null;
    } catch {}
  }

  // Payment processing success/failure counts (last 24h)
  let paymentSuccessCount = 0;
  let paymentFailureCount = 0;
  if (supabaseAdmin) {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const successTypes = ['ipn_processed_success', 'confirm_success', 'reconcile_success'];
      const failureTypes = ['ipn_error', 'ipn_recovery_failed', 'confirm_error', 'reconciliation_error', 'admin_confirm_conditional_skip'];
      const [{ count: sc }, { count: fc }] = await Promise.all([
        supabaseAdmin.from('webhook_events').select('id', { count: 'exact', head: true }).eq('provider', 'pesapal').in('type', successTypes).gte('created_at', since),
        supabaseAdmin.from('webhook_events').select('id', { count: 'exact', head: true }).eq('provider', 'pesapal').in('type', failureTypes).gte('created_at', since),
      ]);
      paymentSuccessCount = sc || 0;
      paymentFailureCount = fc || 0;
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
    confirm: { lastActivityAt: lastConfirmAt },
    reconciliation: { lastRunAt: lastReconAt },
    paymentEvents: { successCount24h: paymentSuccessCount, failureCount24h: paymentFailureCount },
    analytics: { status: analyticsStatus, lastEventAt: lastAnalyticsAt },
    subscriptions: { status: subscriptionStatus },
  } as const;

  res.status(200).json(payload);
}
