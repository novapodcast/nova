import { supabaseAdmin } from './supabaseAdmin';

export async function findPlanIdForAmount(amount: number = 100): Promise<{ id: string; duration_months: number } | null> {
  if (!supabaseAdmin) return null;
  const { data: tiers } = await supabaseAdmin
    .from('pricing_tiers')
    .select('id, price_rwf, duration_months')
    .order('price_rwf', { ascending: true });
  if (!tiers || tiers.length === 0) return null;
  const match = tiers.find((t: any) => t.price_rwf == amount);
  const tier = match || tiers[0];
  return { id: tier.id as string, duration_months: (tier as any).duration_months || 1 };
}

export async function activateOrExtendSubscription(
  userId: string,
  amount: number = 100,
  durationMonthsOverride?: number
): Promise<{ status: string; expires_at: string } | null> {
  if (!supabaseAdmin) return null;

  const planInfo = await findPlanIdForAmount(amount);
  const planId = planInfo?.id || null;
  const durationMonths = durationMonthsOverride || planInfo?.duration_months || 1;

  const { data: existingSubs } = await supabaseAdmin
    .from('user_subscriptions')
    .select('id, expires_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (existingSubs && existingSubs.length > 1) {
    const idsToDelete = existingSubs.slice(1).map((s: any) => s.id);
    await supabaseAdmin.from('user_subscriptions').delete().in('id', idsToDelete);
  }

  const current = existingSubs && existingSubs.length > 0 ? existingSubs[0] : null;
  const now = new Date();
  const oldExpiry = current?.expires_at ? new Date(current.expires_at) : null;
  // For renewals after expiry, base the new period on NOW, not the old expiry.
  // For active subscriptions, extend from the current expiry (preserves remaining time).
  const base = oldExpiry && oldExpiry > now ? oldExpiry : now;
  const next = new Date(base.getTime());
  next.setMonth(next.getMonth() + durationMonths);

  const row = {
    user_id: userId,
    status: 'active',
    expires_at: next.toISOString(),
    plan_id: planId,
    trial_end: next.toISOString(),
  };

  if (current) {
    const { error: sErr } = await supabaseAdmin
      .from('user_subscriptions')
      .update(row)
      .eq('id', current.id);
    if (sErr) {
      console.warn('[activateSubscription][update][warn]', sErr.message);
      return null;
    }
  } else {
    const { error: sErr } = await supabaseAdmin
      .from('user_subscriptions')
      .insert(row);
    if (sErr) {
      console.warn('[activateSubscription][insert][warn]', sErr.message);
      return null;
    }
  }

  return { status: 'active', expires_at: next.toISOString() };
}
