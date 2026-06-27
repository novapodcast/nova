import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = (req.query.userId as string) || '';
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  if (!supabaseAdmin) return res.status(500).json({ error: 'supabaseAdmin not configured' });

  const result: any = { userId };

  // Check user_subscriptions
  const { data: sub, error: subErr } = await supabaseAdmin
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();
  result.subscription = sub;
  result.subscriptionError = subErr?.message || null;

  // Check payments
  const { data: pays, error: paysErr } = await supabaseAdmin
    .from('payments')
    .select('id, transaction_id, amount, currency, status, created_at, user_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);
  result.payments = pays || [];
  result.paymentsError = paysErr?.message || null;

  // Check billing_history
  const { data: billing, error: billingErr } = await supabaseAdmin
    .from('billing_history')
    .select('*')
    .eq('user_id', userId)
    .limit(5);
  result.billingHistory = billing || [];
  result.billingError = billingErr?.message || null;

  // Check profiles
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', userId)
    .single();
  result.profile = profile;
  result.profileError = profileErr?.message || null;

  return res.status(200).json(result);
}
