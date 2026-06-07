import type { NextApiRequest, NextApiResponse } from 'next';
import { submitOrderRequest } from '../../../lib/pesapal';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = req.body || {};
    const required = ['amount', 'currency', 'description', 'callbackUrl', 'billingAddress'];
    for (const key of required) if (!body[key]) return res.status(400).json({ error: `Missing ${key}` });

    // Strict idempotency check: if idempotency_key exists, check for existing payment
    if (supabaseAdmin && body.idempotencyKey) {
      const { data: existing } = await supabaseAdmin
        .from('payments')
        .select('id, transaction_id, status, gateway_status')
        .eq('idempotency_key', body.idempotencyKey)
        .single();
      if (existing) {
        // Return existing payment if found
        return res.status(200).json({
          orderTrackingId: (existing as any).gateway_status?.orderTrackingId || null,
          merchantReference: existing.transaction_id,
          redirectUrl: (existing as any).gateway_status?.redirectUrl || null,
          duplicate: true,
          status: existing.status,
        });
      }
    }

    // Optional duplicate guard: if there's a very recent pending for same user+amount, reject
    if (supabaseAdmin && body.userId) {
      const since = new Date(Date.now() - 3 * 60 * 1000).toISOString();
      const { data: dupe } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('user_id', body.userId)
        .eq('amount', body.amount)
        .eq('status', 'pending')
        .gte('created_at', since)
        .limit(1);
      if (dupe && dupe.length) return res.status(409).json({ error: 'Recent pending payment exists' });
    }

    // Forward client idempotencyKey as Pesapal id when available
    const order = await submitOrderRequest({ ...body, id: body.idempotencyKey });

    // Optional: create a pending payment server-side (requires service key)
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from('payments').insert({
        user_id: body.userId || null,
        transaction_id: order.merchantReference,
        amount: body.amount,
        currency: body.currency,
        payment_method: body.method || 'unknown',
        status: 'pending',
        gateway_status: order,
        idempotency_key: body.idempotencyKey || null,
      });
      if (error) console.warn('[payments][insert][warn]', error.message);
    }

    res.status(200).json(order);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to create order' });
  }
}
