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
  const { limit = '50', sinceHours = '72' } = req.query as any;
  const since = new Date(Date.now() - parseInt(sinceHours, 10) * 3600 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('user_id, transaction_id, amount, currency, created_at')
    .eq('status', 'failed')
    .gte('created_at', since)
    .limit(parseInt(limit, 10));
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ ok: true, items: data || [] });
}
