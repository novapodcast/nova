import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = (req.query.userId as string) || '';
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  if (!supabaseAdmin) return res.status(500).json({ error: 'supabaseAdmin not configured' });

  // Get all subscription rows for this user
  const { data: subs, error } = await supabaseAdmin
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (error) return res.status(500).json({ error: error.message, query: 'select_all' });

  if (!subs || subs.length === 0) {
    // No subscription row exists — create one
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    const { data: created, error: createErr } = await supabaseAdmin
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        status: 'active',
        expires_at: next.toISOString(),
      })
      .select()
      .single();

    if (createErr) return res.status(500).json({ error: createErr.message, query: 'insert' });
    return res.status(200).json({ ok: true, action: 'created', subscription: created });
  }

  if (subs.length === 1) {
    // Single row — ensure it's active
    const sub = subs[0];
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('user_subscriptions')
      .update({ status: 'active', expires_at: next.toISOString() })
      .eq('id', sub.id)
      .select()
      .single();

    if (updateErr) return res.status(500).json({ error: updateErr.message, query: 'update' });
    return res.status(200).json({ ok: true, action: 'updated', subscription: updated });
  }

  // Multiple rows — keep the most recent, delete the rest
  const sorted = subs.sort((a: any, b: any) =>
    new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()
  );
  const keep = sorted[0];
  const deleteIds = sorted.slice(1).map((s: any) => s.id);

  const next = new Date();
  next.setMonth(next.getMonth() + 1);

  // Update the kept row
  await supabaseAdmin
    .from('user_subscriptions')
    .update({ status: 'active', expires_at: next.toISOString() })
    .eq('id', keep.id);

  // Delete duplicates
  const { error: delErr } = await supabaseAdmin
    .from('user_subscriptions')
    .delete()
    .in('id', deleteIds);

  if (delErr) return res.status(500).json({ error: delErr.message, query: 'delete_duplicates' });

  return res.status(200).json({
    ok: true,
    action: 'deduplicated',
    keptId: keep.id,
    deletedIds,
    subscription: { ...keep, status: 'active', expires_at: next.toISOString() },
  });
}
