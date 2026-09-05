import { supabaseAdmin } from './supabaseAdmin';
import { logPaymentEvent } from './paymentLog';
import { activateOrExtendSubscription } from './subscriptions';
import { sendPaymentSuccessEmail, sendPaymentFailedEmail, sendPush } from './notify';

export interface PesapalStatus {
  paymentMethod: string;
  amount: number;
  currency: string;
  paymentStatusDescription: string;
  paymentStatusCode: string;
  merchantReference: string;
  orderTrackingId: string;
  confirmationCode: string;
  createdDate: string;
  status: string;
  error: any;
  raw: any;
}

export interface PaymentRow {
  id: string;
  user_id: string | null;
  transaction_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  order_tracking_id: string | null;
  gateway_status: any;
  idempotency_key: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function extractUserIdFromMerchantRef(merchantRef: string): string | null {
  if (!merchantRef || merchantRef.length < 36) return null;
  const potentialUuid = merchantRef.substring(0, 36);
  if (UUID_REGEX.test(potentialUuid)) return potentialUuid;
  return null;
}

export async function verifyUserExists(userId: string): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const { data } = await supabaseAdmin.from('profiles').select('id').eq('id', userId).single();
  return !!data;
}

export async function findPayment(merchantRef?: string, orderTrackingId?: string): Promise<PaymentRow | null> {
  if (!supabaseAdmin) return null;

  if (merchantRef) {
    const { data } = await supabaseAdmin
      .from('payments')
      .select('id, user_id, transaction_id, amount, currency, status, payment_method, order_tracking_id, gateway_status, idempotency_key')
      .eq('transaction_id', merchantRef)
      .single();
    if (data) return data as PaymentRow;
  }

  if (orderTrackingId) {
    const { data } = await supabaseAdmin
      .from('payments')
      .select('id, user_id, transaction_id, amount, currency, status, payment_method, order_tracking_id, gateway_status, idempotency_key')
      .eq('order_tracking_id', orderTrackingId)
      .single();
    if (data) return data as PaymentRow;
  }

  return null;
}

export async function recoverPayment(status: PesapalStatus): Promise<PaymentRow | null> {
  if (!supabaseAdmin) return null;
  const merchantRef = status.merchantReference;
  if (!merchantRef) return null;

  await logPaymentEvent('payment_recovery_started', { merchantRef, orderTrackingId: status.orderTrackingId });

  const userId = extractUserIdFromMerchantRef(merchantRef);
  if (!userId) {
    await logPaymentEvent('payment_recovery_failed', { reason: 'cannot_extract_user_id', merchantRef });
    return null;
  }

  const userExists = await verifyUserExists(userId);
  if (!userExists) {
    await logPaymentEvent('payment_recovery_failed', { reason: 'user_not_found', userId, merchantRef });
    return null;
  }

  const statusDesc = (status.paymentStatusDescription || '').toUpperCase();
  const isCompleted = statusDesc.includes('COMPLETED') || statusDesc.includes('SUCCESS');
  const isFailed = statusDesc.includes('FAILED') || statusDesc.includes('INVALID');
  const paymentStatus = isCompleted ? 'succeeded' : isFailed ? 'failed' : 'pending';

  const insertData: Record<string, any> = {
    user_id: userId,
    transaction_id: merchantRef,
    amount: status.amount || 0,
    currency: status.currency || 'RWF',
    payment_method: status.paymentMethod || 'unknown',
    status: paymentStatus,
    gateway_status: status.raw,
    order_tracking_id: status.orderTrackingId || null,
    confirmation_code: status.confirmationCode || null,
    idempotency_key: merchantRef,
    completed_at: isCompleted ? new Date().toISOString() : null,
  };

  const { data, error } = await supabaseAdmin
    .from('payments')
    .insert(insertData)
    .select('id, user_id, transaction_id, amount, currency, status, payment_method, order_tracking_id, gateway_status, idempotency_key')
    .single();

  if (error) {
    if (error.code === '23505') {
      await logPaymentEvent('payment_recovery_duplicate', { merchantRef, message: 'Payment already exists' });
      return findPayment(merchantRef, status.orderTrackingId);
    }
    await logPaymentEvent('payment_recovery_failed', { reason: 'insert_error', error: error.message, merchantRef });
    return null;
  }

  await logPaymentEvent('payment_recovered', { paymentId: (data as any).id, userId, merchantRef, status: paymentStatus });
  return data as PaymentRow;
}

export async function processCompletedPayment(
  payment: PaymentRow,
  status: PesapalStatus,
  source: string
): Promise<{ ok: boolean; subscriptionActivated: boolean }> {
  if (!supabaseAdmin) return { ok: false, subscriptionActivated: false };

  if (payment.status === 'succeeded') {
    await logPaymentEvent(`${source}_duplicate`, { paymentId: payment.id, transactionId: payment.transaction_id });
    return { ok: true, subscriptionActivated: false };
  }

  // ── Concurrency-safe status transition ──────────────────────
  // Use a conditional UPDATE: only update if status is still 'pending'.
  // If two concurrent requests both reach this point, only one will
  // actually update the row (the other will get 0 rows updated).
  const { data: updatedRows, count } = await supabaseAdmin
    .from('payments')
    .update({
      status: 'succeeded',
      gateway_status: status.raw,
      order_tracking_id: status.orderTrackingId || payment.order_tracking_id,
      confirmation_code: status.confirmationCode || null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', payment.id)
    .eq('status', 'pending')
    .select('id');

  // If no rows were updated, another concurrent request already processed this payment
  if (!updatedRows || updatedRows.length === 0) {
    await logPaymentEvent(`${source}_concurrent_skip`, { paymentId: payment.id, transactionId: payment.transaction_id });
    return { ok: true, subscriptionActivated: false };
  }

  let subscriptionActivated = false;
  const userId = payment.user_id;
  if (userId) {
    const newSub = await activateOrExtendSubscription(userId, payment.amount || status.amount || 0);
    subscriptionActivated = !!newSub;

    const { data: existingBilling } = await supabaseAdmin
      .from('billing_history')
      .select('id')
      .eq('transaction_id', payment.transaction_id)
      .limit(1);

    if (!existingBilling || existingBilling.length === 0) {
      try {
        await supabaseAdmin.from('billing_history').insert({
          user_id: userId,
          transaction_id: payment.transaction_id,
          amount: payment.amount || status.amount || 0,
          currency: payment.currency || status.currency || 'RWF',
          description: 'Subscription payment',
        });
      } catch (billingErr: any) {
        console.warn(`[processCompletedPayment] billing_history insert failed (likely concurrent): ${billingErr?.message}`);
      }
    }

    try {
      const { data: profile } = await supabaseAdmin.from('profiles').select('email, full_name').eq('id', userId).single();
      if (profile?.email) {
        await sendPaymentSuccessEmail(profile.email, profile.full_name || '', payment.transaction_id, payment.amount || status.amount || 0, payment.currency || 'RWF');
      }
    } catch {}

    try {
      const { data: tokens } = await supabaseAdmin.from('push_tokens').select('token').eq('user_id', userId);
      const expoTokens = (tokens || []).map((t: any) => t.token);
      await sendPush(expoTokens, { title: 'Payment received', body: 'Your Nova subscription is active. Enjoy!', data: { type: 'payment_success', transaction_id: payment.transaction_id } });
    } catch {}
  }

  await logPaymentEvent(`${source}_success`, { paymentId: payment.id, userId, subscriptionActivated });
  return { ok: true, subscriptionActivated };
}

export async function processFailedPayment(
  payment: PaymentRow,
  status: PesapalStatus,
  source: string
): Promise<void> {
  if (!supabaseAdmin) return;

  if (payment.status === 'failed') {
    await logPaymentEvent(`${source}_duplicate`, { paymentId: payment.id, transactionId: payment.transaction_id });
    return;
  }

  // Concurrency-safe: only update if still pending
  const { data: updatedRows } = await supabaseAdmin
    .from('payments')
    .update({
      status: 'failed',
      gateway_status: status.raw,
      order_tracking_id: status.orderTrackingId || payment.order_tracking_id,
      confirmation_code: status.confirmationCode || null,
    })
    .eq('id', payment.id)
    .eq('status', 'pending')
    .select('id');

  if (!updatedRows || updatedRows.length === 0) {
    await logPaymentEvent(`${source}_concurrent_skip`, { paymentId: payment.id, transactionId: payment.transaction_id });
    return;
  }

  if (payment.user_id) {
    try {
      const { data: profile } = await supabaseAdmin.from('profiles').select('email, full_name').eq('id', payment.user_id).single();
      if (profile?.email) {
        await sendPaymentFailedEmail(profile.email, profile.full_name || '', payment.transaction_id, payment.amount || 0, payment.currency || 'RWF', status.paymentStatusDescription);
      }
    } catch {}
  }

  await logPaymentEvent(`${source}_failed`, { paymentId: payment.id, statusDesc: status.paymentStatusDescription });
}

export async function findOrCreatePayment(status: PesapalStatus, source: string): Promise<PaymentRow | null> {
  const existing = await findPayment(status.merchantReference, status.orderTrackingId);
  if (existing) return existing;

  await logPaymentEvent(`${source}_payment_not_found`, {
    merchantRef: status.merchantReference,
    orderTrackingId: status.orderTrackingId,
  });

  const recovered = await recoverPayment(status);
  if (!recovered) {
    await logPaymentEvent(`${source}_recovery_failed`, {
      merchantRef: status.merchantReference,
      orderTrackingId: status.orderTrackingId,
    });
  }
  return recovered;
}
