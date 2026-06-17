import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdmin } from '../../../lib/adminAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authorization
  const auth = await verifyAdmin(req);
  if (!auth.authorized) {
    return res.status(401).json({ error: auth.error || 'Unauthorized' });
  }

  if (!supabaseAdmin) return res.status(200).json({ ok: true, data: [], note: 'no-admin-client' });
  const { status, limit = 50, offset = 0 } = req.query as any;
  let q = supabaseAdmin.from('payments').select('*').order('created_at', { ascending: false }).range(Number(offset), Number(offset) + Number(limit) - 1);
  if (status) q = q.eq('status', status as string);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ data });
}
