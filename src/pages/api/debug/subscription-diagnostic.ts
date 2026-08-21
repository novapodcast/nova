import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdmin } from '../../../lib/auth/admin';
import { computeEffectiveStatus, computeDaysRemaining } from '../../../lib/subscriptionStatus';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabaseAdmin) return res.status(500).json({ error: 'Server not configured' });

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  const { isAdmin } = await verifyAdmin(token);
  if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });

  const userId = (req.query.userId as string) || '';
  const transactionId = (req.query.transactionId as string) || '';
  const orderTrackingId = (req.query.orderTrackingId as string) || '';
  const confirmationCode = (req.query.confirmationCode as string) || '';

  if (!userId && !transactionId && !orderTrackingId && !confirmationCode) {
    return res.status(400).json({ error: 'Provide userId, transactionId, orderTrackingId, or confirmationCode query param' });
  }

  const result: any = { timestamp: new Date().toISOString() };

  // If transactionId provided, look up payment
  if (transactionId) {
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('id, user_id, transaction_id, amount, currency, status, payment_method, created_at, gateway_status, idempotency_key')
      .eq('transaction_id', transactionId)
      .single();
    result.payment = payment || null;
    if (payment?.user_id && !userId) {
      result.inferredUserId = payment.user_id;
    }
  }

  // If orderTrackingId provided, look up payment by gateway_status containing the order tracking ID
  if (!result.payment && orderTrackingId) {
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('id, user_id, transaction_id, amount, currency, status, payment_method, created_at, gateway_status, idempotency_key')
      .ilike('gateway_status', `%${orderTrackingId}%`)
      .limit(1)
      .maybeSingle();
    result.payment = payment || null;
    if (payment?.user_id && !userId) {
      result.inferredUserId = payment.user_id;
    }
  }

  // If confirmationCode provided, look up payment by gateway_status containing the confirmation code
  if (!result.payment && confirmationCode) {
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('id, user_id, transaction_id, amount, currency, status, payment_method, created_at, gateway_status, idempotency_key')
      .ilike('gateway_status', `%${confirmationCode}%`)
      .limit(1)
      .maybeSingle();
    result.payment = payment || null;
    if (payment?.user_id && !userId) {
      result.inferredUserId = payment.user_id;
    }
  }

  const targetUserId = userId || result.inferredUserId;
  if (!targetUserId) {
    return res.status(200).json(result);
  }

  // Fetch all subscription records for this user
  const { data: allSubs } = await supabaseAdmin
    .from('user_subscriptions')
    .select('id, status, expires_at, plan_id, trial_end, created_at, updated_at')
    .eq('user_id', targetUserId)
    .order('updated_at', { ascending: false });

  result.allSubscriptions = allSubs || [];

  // Compute effective status for the most recent one
  if (allSubs && allSubs.length > 0) {
    const latest = allSubs[0] as any;
    result.selectedSubscription = latest;
    result.effectiveStatus = computeEffectiveStatus(latest.status, latest.expires_at);
    result.daysRemaining = computeDaysRemaining(latest.expires_at);
    result.isExpired = result.effectiveStatus === 'expired';
    result.isActive = result.effectiveStatus === 'active' || result.effectiveStatus === 'expiring_soon';
  } else {
    result.selectedSubscription = null;
    result.effectiveStatus = 'expired';
    result.isActive = false;
  }

  // Fetch pricing tier info
  if (result.selectedSubscription?.plan_id) {
    const { data: tier } = await supabaseAdmin
      .from('pricing_tiers')
      .select('id, plan_name, display_name_en, price_rwf, duration_months')
      .eq('id', result.selectedSubscription.plan_id)
      .single();
    result.planTier = tier || null;
  }

  // Fetch all payments for this user
  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('id, transaction_id, amount, currency, status, created_at, payment_method')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })
    .limit(10);
  result.payments = payments || [];

  // Fetch billing history
  const { data: billing } = await supabaseAdmin
    .from('billing_history')
    .select('id, transaction_id, amount, currency, description, created_at')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })
    .limit(10);
  result.billingHistory = billing || [];

  // Fetch pricing tiers for amount comparison
  const { data: tiers } = await supabaseAdmin
    .from('pricing_tiers')
    .select('id, plan_name, display_name_en, price_rwf, duration_months, is_active')
    .order('price_rwf', { ascending: true });
  result.allPricingTiers = tiers || [];

  // Fetch recent webhook events for this user
  const { data: events } = await supabaseAdmin
    .from('webhook_events')
    .select('id, provider, type, payload, created_at')
    .order('created_at', { ascending: false })
    .limit(20);
  result.recentWebhookEvents = events || [];

  return res.status(200).json(result);
}
