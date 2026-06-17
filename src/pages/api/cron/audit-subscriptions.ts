import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

async function logOps(type: string, payload: any) {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from('webhook_events').insert({ provider: 'ops', type, payload });
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseAdmin) return res.status(200).json({ ok: true, note: 'no-admin-client' });

  // Find succeeded payments without active subscriptions
  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('user_id, transaction_id, amount, currency')
    .eq('status', 'succeeded');

  let fixes = 0;
  for (const p of payments || []) {
    const userId = (p as any).user_id;
    const { data: sub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id, status, expires_at')
      .eq('user_id', userId)
      .single();

    const active = sub && sub.status === 'active' && new Date(sub.expires_at) > new Date();
    if (!active) {
      const base = sub?.expires_at ? new Date(sub.expires_at) : new Date();
      const next = new Date(base.getTime());
      next.setMonth(next.getMonth() + 1);
      const upsert: any = { user_id: userId, status: 'active', expires_at: next.toISOString() };
      if (sub?.id) upsert.id = sub.id;
      const { error } = await supabaseAdmin.from('user_subscriptions').upsert(upsert).select().single();
      if (!error) fixes++;
      await logOps('subscription_fix', { userId, transaction_id: (p as any).transaction_id });
    }
  }

  res.status(200).json({ ok: true, reviewed: (payments || []).length, fixes });
}
