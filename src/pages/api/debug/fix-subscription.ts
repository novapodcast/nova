import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

async function findPlanId(amount: number = 100): Promise<string | null> {
  if (!supabaseAdmin) return null;
  const { data: tiers } = await supabaseAdmin
    .from('pricing_tiers')
    .select('id, price_rwf')
    .order('price_rwf', { ascending: true });
  if (!tiers || tiers.length === 0) return null;
  const match = tiers.find((t: any) => t.price_rwf == amount);
  return (match || tiers[0]).id as string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = (req.query.userId as string) || '';
  const amount = parseInt((req.query.amount as string) || '100', 10);
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  if (!supabaseAdmin) return res.status(500).json({ error: 'supabaseAdmin not configured' });

  const planId = await findPlanId(amount);
  const next = new Date();
  next.setMonth(next.getMonth() + 1);

  const { data: subs, error } = await supabaseAdmin
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (error) return res.status(500).json({ error: error.message, query: 'select_all' });

  const row = {
    user_id: userId,
    status: 'active',
    expires_at: next.toISOString(),
    plan_id: planId,
  };

  if (!subs || subs.length === 0) {
    const { data: created, error: createErr } = await supabaseAdmin
      .from('user_subscriptions')
      .insert(row)
      .select()
      .single();

    if (createErr) return res.status(500).json({ error: createErr.message, query: 'insert' });
    return res.status(200).json({ ok: true, action: 'created', subscription: created });
  }

  if (subs.length === 1) {
    const sub = subs[0];
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('user_subscriptions')
      .update(row)
      .eq('id', sub.id)
      .select()
      .single();

    if (updateErr) return res.status(500).json({ error: updateErr.message, query: 'update' });
    return res.status(200).json({ ok: true, action: 'updated', subscription: updated });
  }

  const sorted = subs.sort((a: any, b: any) =>
    new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()
  );
  const keep = sorted[0];
  const deleteIds = sorted.slice(1).map((s: any) => s.id);

  await supabaseAdmin
    .from('user_subscriptions')
    .update(row)
    .eq('id', keep.id);

  const { error: delErr } = await supabaseAdmin
    .from('user_subscriptions')
    .delete()
    .in('id', deleteIds);

  if (delErr) return res.status(500).json({ error: delErr.message, query: 'delete_duplicates' });

  return res.status(200).json({
    ok: true,
    action: 'deduplicated',
    keptId: keep.id,
    deletedIds: deleteIds,
    subscription: { ...keep, ...row },
  });
}
