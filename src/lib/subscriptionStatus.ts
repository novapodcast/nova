import { supabaseAdmin } from './supabaseAdmin';

export type EffectiveStatus = 'active' | 'expiring_soon' | 'expired' | 'cancelled' | 'past_due';

export interface SubscriptionState {
  status: string;
  effectiveStatus: EffectiveStatus;
  expiresAt: string | null;
  planId: string | null;
  planName: string | null;
  daysRemaining: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
  isActive: boolean;
}

const EXPIRING_SOON_HORIZON_DAYS = 7;

export function computeEffectiveStatus(
  storedStatus: string,
  expiresAt: string | null,
  now: Date = new Date(),
): EffectiveStatus {
  if (storedStatus === 'cancelled') return 'cancelled';
  if (storedStatus === 'past_due') return 'past_due';
  if (storedStatus === 'trial') {
    if (!expiresAt) return 'active';
    return new Date(expiresAt) > now ? 'active' : 'expired';
  }

  if (!expiresAt) {
    return storedStatus === 'active' ? 'active' : 'expired';
  }

  const expiry = new Date(expiresAt);
  if (expiry <= now) return 'expired';

  if (storedStatus === 'active') {
    const horizon = new Date(now.getTime());
    horizon.setDate(horizon.getDate() + EXPIRING_SOON_HORIZON_DAYS);
    if (expiry <= horizon) return 'expiring_soon';
    return 'active';
  }

  return 'expired';
}

export function computeDaysRemaining(expiresAt: string | null, now: Date = new Date()): number | null {
  if (!expiresAt) return null;
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export async function getSubscriptionState(userId: string): Promise<SubscriptionState> {
  const defaultState: SubscriptionState = {
    status: 'none',
    effectiveStatus: 'expired',
    expiresAt: null,
    planId: null,
    planName: null,
    daysRemaining: null,
    isExpired: true,
    isExpiringSoon: false,
    isActive: false,
  };

  if (!supabaseAdmin) return defaultState;

  const { data: sub } = await supabaseAdmin
    .from('user_subscriptions')
    .select('status, expires_at, plan_id')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (!sub || sub.length === 0) return defaultState;

  const row = sub[0] as any;
  const storedStatus = row.status || 'active';
  const expiresAt = row.expires_at || null;
  const planId = row.plan_id || null;

  const effectiveStatus = computeEffectiveStatus(storedStatus, expiresAt);
  const daysRemaining = computeDaysRemaining(expiresAt);

  let planName: string | null = null;
  if (planId) {
    const { data: tier } = await supabaseAdmin
      .from('pricing_tiers')
      .select('display_name_en, plan_name')
      .eq('id', planId)
      .single();
    if (tier) {
      planName = (tier as any).display_name_en || (tier as any).plan_name || null;
    }
  }

  return {
    status: storedStatus,
    effectiveStatus,
    expiresAt,
    planId,
    planName,
    daysRemaining,
    isExpired: effectiveStatus === 'expired',
    isExpiringSoon: effectiveStatus === 'expiring_soon',
    isActive: effectiveStatus === 'active' || effectiveStatus === 'expiring_soon',
  };
}
