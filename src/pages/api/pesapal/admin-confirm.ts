import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendPaymentSuccessEmail } from '../../../lib/notify';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { transactionId, userId, amount, currency, durationMonths } = req.body || {};
    if (!transactionId || !userId) {
      return res.status(400).json({ error: 'Missing transactionId or userId' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Server not configured (SUPABASE_SERVICE_ROLE_KEY missing)' });
    }

    // 1. Update payment to succeeded
    const { data: payment, error: pErr } = await supabaseAdmin
      .from('payments')
      .update({ status: 'succeeded' })
      .eq('transaction_id', transactionId)
      .eq('user_id', userId)
      .select('id, user_id, amount, currency, status')
      .single();

    if (pErr || !payment) {
      return res.status(404).json({ error: 'Payment not found', detail: pErr?.message });
    }

    // 2. Activate subscription — deduplicate first
    const months = durationMonths || 1;
    const { data: existingSubs } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id, expires_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    // Delete duplicates if more than 1 row
    if (existingSubs && existingSubs.length > 1) {
      const idsToDelete = existingSubs.slice(1).map((s: any) => s.id);
      await supabaseAdmin.from('user_subscriptions').delete().in('id', idsToDelete);
    }

    const current = existingSubs && existingSubs.length > 0 ? existingSubs[0] : null;
    const base = current?.expires_at ? new Date(current.expires_at) : new Date();
    const next = new Date(base.getTime());
    next.setMonth(next.getMonth() + months);

    if (current) {
      // Update existing row
      const { error: sErr } = await supabaseAdmin
        .from('user_subscriptions')
        .update({ status: 'active', expires_at: next.toISOString() })
        .eq('id', current.id);
      if (sErr) console.warn('[admin-confirm][subscription][warn]', sErr.message);
    } else {
      // Insert new row
      const { error: sErr } = await supabaseAdmin
        .from('user_subscriptions')
        .insert({ user_id: userId, status: 'active', expires_at: next.toISOString() });
      if (sErr) console.warn('[admin-confirm][subscription][warn]', sErr.message);
    }

    // 3. Billing history (idempotent)
    const { data: existingBilling } = await supabaseAdmin
      .from('billing_history')
      .select('id')
      .eq('transaction_id', transactionId)
      .limit(1);

    if (!existingBilling || existingBilling.length === 0) {
      await supabaseAdmin.from('billing_history').insert({
        user_id: userId,
        transaction_id: transactionId,
        amount: amount || payment.amount || 0,
        currency: currency || payment.currency || 'RWF',
        description: `Subscription payment (${months} month${months > 1 ? 's' : ''})`,
      });
    }

    // 4. Send success email
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      if (profile?.email) {
        await sendPaymentSuccessEmail(
          profile.email,
          profile.full_name || '',
          transactionId,
          amount || payment.amount || 0,
          currency || payment.currency || 'RWF'
        );
      }
    } catch (e: any) {
      console.warn('[admin-confirm][email][warn]', e?.message);
    }

    // 5. Send push notification
    try {
      const { data: tokens } = await supabaseAdmin.from('push_tokens').select('token').eq('user_id', userId);
      const expoTokens = (tokens || []).map((t: any) => t.token);
      if (expoTokens.length) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expoTokens.map((to: string) => ({
            to,
            title: 'Payment received',
            body: 'Your Nova subscription is active. Enjoy!',
            data: { type: 'payment_success', transaction_id: transactionId },
            sound: 'default',
          }))),
        });
      }
    } catch {}

    return res.status(200).json({
      ok: true,
      status: 'succeeded',
      paymentId: payment.id,
      subscription: { status: 'active', expires_at: next.toISOString() },
    });
  } catch (e: any) {
    console.error('[admin-confirm] error', e);
    return res.status(500).json({ error: e?.message || 'Admin confirm failed' });
  }
}
