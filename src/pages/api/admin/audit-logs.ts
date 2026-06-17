import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdmin } from '../../../lib/adminAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authorization
  const auth = await verifyAdmin(req);
  if (!auth.authorized) {
    return res.status(401).json({ error: auth.error || 'Unauthorized' });
  }

  if (!supabaseAdmin) return res.status(200).json({ ok: true, note: 'no-admin-client' });
  const { limit = '100', provider } = req.query as any;
  let q = supabaseAdmin.from('webhook_events').select('*').order('created_at', { ascending: false }).limit(parseInt(limit, 10));
  if (provider) q = q.eq('provider', provider as string);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ ok: true, items: data || [] });
}
