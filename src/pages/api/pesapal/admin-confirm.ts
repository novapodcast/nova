import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdmin } from '../../../lib/adminAuth';
import { sendPaymentSuccessEmail } from '../../../lib/notify';
import { activateOrExtendSubscription } from '../../../lib/subscriptions';
import { logPaymentEvent } from '../../../lib/paymentLog';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await verifyAdmin(req);
  if (!auth.authorized) {
    return res.status(401).json({ error: auth.error || 'Unauthorized' });
  }

  try {
    const { transactionId, userId, amount, currency, durationMonths } = req.body || {};
    if (!transactionId || !userId) {
      return res.status(400).json({ error: 'Missing transactionId or userId' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Server not configured (SUPABASE_SERVICE_ROLE_KEY missing)' });
    }

    // 1. Fetch the payment record first (without updating)
    const { data: existingPayment, error: fetchErr } = await supabaseAdmin
      .from('payments')
      .select('id, user_id, amount, currency, status, transaction_id')
      .eq('transaction_id', transactionId)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !existingPayment) {
      return res.status(404).json({ error: 'Payment not found', detail: fetchErr?.message });
    }

    // 2. If already succeeded, do NOT re-activate subscription
    if (existingPayment.status === 'succeeded') {
      await logPaymentEvent('admin_confirm_duplicate', {
        paymentId: existingPayment.id,
        transactionId,
        userId,
      });
      return res.status(200).json({
        ok: true,
        status: 'already_succeeded',
        paymentId: existingPayment.id,
        subscription: null,
      });
    }

    // 3. Conditional update: only transition pending → succeeded
    const { data: updatedRows, error: updateErr } = await supabaseAdmin
      .from('payments')
      .update({ status: 'succeeded', completed_at: new Date().toISOString() })
      .eq('id', existingPayment.id)
      .eq('status', 'pending')
      .select('id, user_id, amount, currency, status');

    if (updateErr || !updatedRows || updatedRows.length === 0) {
      // Another concurrent call may have already processed this payment,
      // or the payment was not in 'pending' state.
      await logPaymentEvent('admin_confirm_conditional_skip', {
        paymentId: existingPayment.id,
        transactionId,
        currentStatus: existingPayment.status,
      });
      return res.status(200).json({
        ok: true,
        status: 'already_succeeded',
        paymentId: existingPayment.id,
        subscription: null,
      });
    }

    const payment = updatedRows[0];

    // 4. Activate subscription — only reached if we successfully transitioned pending → succeeded
    const months = durationMonths || 1;
    const subscription = await activateOrExtendSubscription(userId, amount || payment.amount || 0, months);
    if (!subscription) {
      console.warn('[admin-confirm][subscription] failed to activate/extend');
    }

    await logPaymentEvent('admin_confirm_success', {
      paymentId: payment.id,
      transactionId,
      userId,
      subscriptionActivated: !!subscription,
    });

    // 3. Billing history (idempotent)
    const { data: existingBilling } = await supabaseAdmin
      .from('billing_history')
      .select('id')
      .eq('transaction_id', transactionId)
      .limit(1);

    if (!existingBilling || existingBilling.length === 0) {
      try {
        await supabaseAdmin.from('billing_history').insert({
          user_id: userId,
          transaction_id: transactionId,
          amount: amount || payment.amount || 0,
          currency: currency || payment.currency || 'RWF',
          description: `Subscription payment (${months} month${months > 1 ? 's' : ''})`,
        });
      } catch (billingErr: any) {
        console.warn(`[admin-confirm] billing_history insert failed (likely concurrent): ${billingErr?.message}`);
      }
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
      subscription: subscription || { status: 'active', expires_at: null },
    });
  } catch (e: any) {
    console.error('[admin-confirm] error', e);
    return res.status(500).json({ error: e?.message || 'Admin confirm failed' });
  }
}
