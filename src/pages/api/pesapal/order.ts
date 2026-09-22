import type { NextApiRequest, NextApiResponse } from 'next';
import { submitOrderRequest } from '../../../lib/pesapal';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { logPaymentEvent } from '../../../lib/paymentLog';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const required = ['currency', 'description', 'callbackUrl', 'billingAddress'];
    for (const key of required) {
      if (!body[key]) return res.status(400).json({ error: `Missing ${key}` });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Server not configured — SUPABASE_SERVICE_ROLE_KEY missing' });
    }

    // ── Server-side plan/amount authority ──────────────────────
    // The client must send a planId. The server looks up the pricing tier
    // and derives the authoritative amount and currency.
    // Client-provided amount is only a consistency check.
    let authoritativeAmount: number;
    let authoritativeCurrency: string = body.currency;
    let planId: string | null = null;
    let durationMonths: number | null = null;

    if (body.planId) {
      const { data: tier, error: tierErr } = await supabaseAdmin
        .from('pricing_tiers')
        .select('id, price_rwf, duration_months, is_active')
        .eq('id', body.planId)
        .single();

      if (tierErr || !tier) {
        return res.status(400).json({ error: 'Invalid planId — no matching pricing tier found' });
      }
      if (!tier.is_active) {
        return res.status(400).json({ error: 'Selected plan is not active' });
      }

      authoritativeAmount = tier.price_rwf;
      planId = tier.id;
      durationMonths = tier.duration_months;

      // Consistency check: if client also sent amount, verify it matches
      if (body.amount !== undefined && Number(body.amount) !== Number(authoritativeAmount)) {
        await logPaymentEvent('payment_amount_mismatch', {
          clientAmount: body.amount,
          serverAmount: authoritativeAmount,
          planId,
        });
        return res.status(400).json({
          error: `Amount mismatch: client sent ${body.amount} but plan ${planId} costs ${authoritativeAmount}`,
        });
      }
    } else if (body.amount !== undefined) {
      // Backward compat: no planId, but amount provided
      // Look up tier by amount to verify it's a valid price
      const { data: tiers } = await supabaseAdmin
        .from('pricing_tiers')
        .select('id, price_rwf, duration_months, is_active')
        .eq('is_active', true)
        .order('price_rwf', { ascending: true });

      const match = (tiers || []).find((t: any) => Number(t.price_rwf) === Number(body.amount));
      if (!match) {
        return res.status(400).json({ error: `Amount ${body.amount} does not match any active pricing tier` });
      }
      authoritativeAmount = match.price_rwf;
      planId = match.id;
      durationMonths = match.duration_months;
    } else {
      return res.status(400).json({ error: 'Missing planId or amount' });
    }

    const idempotencyKey = body.idempotencyKey || `NOVA-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // 1. Idempotency check — find existing payment by idempotency_key (no gateway_status needed)
    const { data: existing, error: idemErr } = await supabaseAdmin
      .from('payments')
      .select('id, transaction_id, status, order_tracking_id')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existing && !idemErr) {
      await logPaymentEvent('payment_order_idempotent', { idempotencyKey, paymentId: (existing as any).id, status: (existing as any).status });
      return res.status(200).json({
        orderTrackingId: (existing as any).order_tracking_id || null,
        merchantReference: (existing as any).transaction_id,
        redirectUrl: null,
        duplicate: true,
        status: (existing as any).status,
      });
    }

    // 2. Duplicate guard — reject if very recent pending payment for same user+amount
    if (body.userId) {
      const since = new Date(Date.now() - 3 * 60 * 1000).toISOString();
      const { data: dupe } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('user_id', body.userId)
        .eq('amount', authoritativeAmount)
        .eq('status', 'pending')
        .gte('created_at', since)
        .limit(1);
      if (dupe && dupe.length) {
        return res.status(409).json({ error: 'Recent pending payment exists for this user and amount' });
      }
    }

    await logPaymentEvent('payment_order_started', { userId: body.userId, amount: authoritativeAmount, currency: authoritativeCurrency, idempotencyKey, planId });

    // 3. Create pending payment record BEFORE submitting to Pesapal
    //    If this fails, we do NOT submit to Pesapal — the customer is never charged.
    const { data: paymentRow, error: insertErr } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: body.userId || null,
        transaction_id: idempotencyKey,
        amount: authoritativeAmount,
        currency: authoritativeCurrency,
        payment_method: body.method || 'unknown',
        status: 'pending',
        idempotency_key: idempotencyKey,
        plan_id: planId,
      })
      .select('id')
      .single();

    if (insertErr || !paymentRow) {
      const errMsg = insertErr?.message || 'Unknown insert error';
      await logPaymentEvent('payment_record_created_failed', { error: errMsg, idempotencyKey, userId: body.userId });
      return res.status(500).json({ error: `Failed to create payment record: ${errMsg}` });
    }

    await logPaymentEvent('payment_record_created', { paymentId: paymentRow.id, idempotencyKey, userId: body.userId });

    // 4. Validate IPN notification ID before submitting to Pesapal
    //    An empty notification ID means Pesapal won't send IPN callbacks,
    //    making payment completion unreliable.
    if (!body.notificationId || typeof body.notificationId !== 'string' || body.notificationId.trim() === '') {
      await logPaymentEvent('payment_order_missing_ipn_id', { paymentId: paymentRow.id, idempotencyKey, userId: body.userId });
      await supabaseAdmin.from('payments').update({ status: 'failed' }).eq('id', paymentRow.id);
      return res.status(400).json({
        error: 'Missing or empty IPN notification ID. Payment cannot proceed — IPN registration may have failed.',
      });
    }

    // 5. Submit order to Pesapal
    let order: { orderTrackingId: string; merchantReference: string; redirectUrl: string };
    try {
      order = await submitOrderRequest({ ...body, id: idempotencyKey });
    } catch (pesapalErr: any) {
      await logPaymentEvent('pesapal_order_failed', { paymentId: paymentRow.id, error: pesapalErr?.message, idempotencyKey });
      await supabaseAdmin.from('payments').update({ status: 'failed' }).eq('id', paymentRow.id);
      return res.status(502).json({ error: `Pesapal order submission failed: ${pesapalErr?.message || 'unknown'}` });
    }

    await logPaymentEvent('pesapal_order_created', { paymentId: paymentRow.id, orderTrackingId: order.orderTrackingId, merchantReference: order.merchantReference });

    // 6. Update payment with Pesapal response (gateway_status, order_tracking_id)
    //    If this update fails, the payment row still exists in 'pending' state
    //    and can be recovered by the reconciliation cron.
    const { error: updateErr } = await supabaseAdmin
      .from('payments')
      .update({
        gateway_status: order,
        order_tracking_id: order.orderTrackingId,
        transaction_id: order.merchantReference || idempotencyKey,
      })
      .eq('id', paymentRow.id);

    if (updateErr) {
      await logPaymentEvent('payment_record_update_failed', { paymentId: paymentRow.id, error: updateErr.message });
    }

    // 7. Return Pesapal order data to mobile app
    res.status(200).json(order);
  } catch (e: any) {
    await logPaymentEvent('payment_order_error', { error: e?.message });
    res.status(500).json({ error: e?.message || 'Failed to create order' });
  }
}
