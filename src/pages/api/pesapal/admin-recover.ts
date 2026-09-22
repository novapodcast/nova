import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getTransactionStatus } from '../../../lib/pesapal';
import { verifyAdmin } from '../../../lib/adminAuth';
import { logPaymentEvent } from '../../../lib/paymentLog';
import { findPayment, extractUserIdFromMerchantRef, verifyUserExists } from '../../../lib/paymentProcessing';
import { activateOrExtendSubscription } from '../../../lib/subscriptions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await verifyAdmin(req);
  if (!auth.authorized) {
    return res.status(401).json({ error: auth.error || 'Unauthorized' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const { orderTrackingId, dryRun = true } = req.body || {};

    if (!orderTrackingId) {
      return res.status(400).json({ error: 'Missing orderTrackingId' });
    }

    await logPaymentEvent('admin_recovery_started', { orderTrackingId, dryRun });

    // 1. Fetch transaction status from Pesapal
    let status: any;
    try {
      status = await getTransactionStatus(orderTrackingId);
    } catch (e: any) {
      return res.status(502).json({ error: `Pesapal API error: ${e?.message}` });
    }

    const statusDesc = (status?.paymentStatusDescription || '').toString().toUpperCase();
    const merchantRef = status?.merchantReference || '';
    const amount = status?.amount || 0;
    const currency = status?.currency || 'RWF';
    const confirmationCode = status?.confirmationCode || '';

    await logPaymentEvent('admin_recovery_status', { orderTrackingId, merchantRef, statusDesc, amount });

    if (!statusDesc.includes('COMPLETED') && !statusDesc.includes('SUCCESS')) {
      return res.status(200).json({
        ok: false,
        dryRun,
        reason: 'Transaction not completed at Pesapal',
        pesapalStatus: statusDesc,
        merchantRef,
        amount,
        currency,
      });
    }

    // 2. Check if payment already exists
    const existing = await findPayment(merchantRef, orderTrackingId);

    if (existing) {
      // Check subscription status to detect incomplete recovery
      let subscriptionActive = false;
      let subscriptionExpiresAt: string | null = null;
      if (existing.user_id) {
        try {
          const { data: sub } = await supabaseAdmin
            .from('user_subscriptions')
            .select('status, expires_at')
            .eq('user_id', existing.user_id)
            .order('updated_at', { ascending: false })
            .limit(1);
          if (sub && sub.length > 0) {
            subscriptionActive = sub[0].status === 'active' &&
              (!sub[0].expires_at || new Date(sub[0].expires_at) > new Date());
            subscriptionExpiresAt = sub[0].expires_at || null;
          }
        } catch {}
      }

      await logPaymentEvent('admin_recovery_existing', {
        paymentId: existing.id,
        status: existing.status,
        subscriptionActive,
        merchantRef,
      });

      return res.status(200).json({
        ok: true,
        dryRun,
        recovered: false,
        reason: 'Payment already exists in Nova',
        paymentId: existing.id,
        status: existing.status,
        subscriptionActive,
        subscriptionExpiresAt,
        warning: !subscriptionActive && existing.status === 'succeeded'
          ? 'Payment is succeeded but subscription is NOT active. Subscription activation may have failed during original recovery.'
          : undefined,
        merchantRef,
        amount,
        currency,
      });
    }

    // 3. Extract user ID from merchant reference
    const userId = extractUserIdFromMerchantRef(merchantRef);
    if (!userId) {
      await logPaymentEvent('admin_recovery_failed', { reason: 'cannot_extract_user_id', merchantRef });
      return res.status(200).json({
        ok: false,
        dryRun,
        reason: 'Cannot extract user ID from merchant reference. Manual recovery required.',
        merchantRef,
        amount,
        currency,
        confirmationCode,
      });
    }

    // 4. Verify user exists
    const userExists = await verifyUserExists(userId);
    if (!userExists) {
      await logPaymentEvent('admin_recovery_failed', { reason: 'user_not_found', userId, merchantRef });
      return res.status(200).json({
        ok: false,
        dryRun,
        reason: 'User not found in Nova profiles',
        userId,
        merchantRef,
        amount,
        currency,
      });
    }

    // 5. Verify amount matches a pricing tier
    const { data: tiers } = await supabaseAdmin
      .from('pricing_tiers')
      .select('id, price_rwf, duration_months, display_name_en')
      .order('price_rwf', { ascending: true });

    const matchingTier = (tiers || []).find((t: any) => t.price_rwf == amount);

    if (!matchingTier) {
      await logPaymentEvent('admin_recovery_amount_mismatch', { amount, merchantRef });
      return res.status(200).json({
        ok: false,
        dryRun,
        reason: `Amount ${amount} ${currency} does not match any pricing tier. Manual review required.`,
        userId,
        merchantRef,
        amount,
        currency,
        confirmationCode,
        availableTiers: (tiers || []).map((t: any) => ({ name: t.display_name_en, price: t.price_rwf })),
      });
    }

    // 5b. Validate currency — must match expected currency for pricing tiers
    const expectedCurrency = 'RWF';
    if (currency !== expectedCurrency) {
      await logPaymentEvent('admin_recovery_currency_mismatch', { amount, currency, expectedCurrency, merchantRef });
      return res.status(200).json({
        ok: false,
        dryRun,
        reason: `Currency ${currency} does not match expected ${expectedCurrency}. Manual review required.`,
        userId,
        merchantRef,
        amount,
        currency,
        confirmationCode,
      });
    }

    // 6. Dry run — report what would happen
    if (dryRun) {
      return res.status(200).json({
        ok: true,
        dryRun: true,
        recovered: false,
        wouldDo: {
          createPayment: true,
          activateSubscription: true,
          planId: (matchingTier as any).id,
          planName: (matchingTier as any).display_name_en,
          durationMonths: (matchingTier as any).duration_months,
          amount,
          currency,
          userId,
          merchantRef,
          confirmationCode,
          pesapalStatus: statusDesc,
        },
      });
    }

    // 7. Actual recovery — create payment record
    const { data: paymentRow, error: insertErr } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: userId,
        transaction_id: merchantRef,
        amount,
        currency,
        payment_method: status?.paymentMethod || 'unknown',
        status: 'succeeded',
        gateway_status: status?.raw || status,
        order_tracking_id: orderTrackingId,
        confirmation_code: confirmationCode,
        idempotency_key: merchantRef,
        plan_id: (matchingTier as any).id,
        completed_at: new Date().toISOString(),
      })
      .select('id, user_id, amount, currency, status, transaction_id')
      .single();

    if (insertErr) {
      await logPaymentEvent('admin_recovery_failed', { reason: 'insert_error', error: insertErr.message, merchantRef });
      return res.status(500).json({ error: `Failed to create payment: ${insertErr.message}` });
    }

    // 8. Activate subscription
    const subscription = await activateOrExtendSubscription(
      userId,
      amount,
      (matchingTier as any).duration_months
    );

    // 9. Create billing history (idempotent)
    const { data: existingBilling } = await supabaseAdmin
      .from('billing_history')
      .select('id')
      .eq('transaction_id', merchantRef)
      .limit(1);

    if (!existingBilling || existingBilling.length === 0) {
      try {
        await supabaseAdmin.from('billing_history').insert({
          user_id: userId,
          transaction_id: merchantRef,
          amount,
          currency,
          description: `Subscription payment (${(matchingTier as any).duration_months} month${(matchingTier as any).duration_months > 1 ? 's' : ''}) — recovered`,
        });
      } catch (billingErr: any) {
        console.warn(`[admin-recover] billing_history insert failed (likely concurrent): ${billingErr?.message}`);
      }
    }

    await logPaymentEvent('admin_recovery_completed', {
      paymentId: paymentRow?.id,
      userId,
      merchantRef,
      amount,
      subscriptionActivated: !!subscription,
      expiresAt: subscription?.expires_at || null,
    });

    return res.status(200).json({
      ok: true,
      dryRun: false,
      recovered: true,
      paymentId: paymentRow?.id,
      userId,
      merchantRef,
      amount,
      currency,
      confirmationCode,
      subscription: subscription || { status: 'failed', expires_at: null },
      planName: (matchingTier as any).display_name_en,
    });
  } catch (e: any) {
    console.error('[admin-recover] error', e);
    await logPaymentEvent('admin_recovery_error', { error: e?.message });
    return res.status(500).json({ error: e?.message || 'Recovery failed' });
  }
}
