import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseAdmin) return res.status(200).json({ ok: true, note: 'no-admin-client' });

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [{ data: webhookErrors }, { data: cronEvents }] = await Promise.all([
    supabaseAdmin.from('webhook_events').select('id, type, created_at, payload').gte('created_at', since).ilike('type', '%error%'),
    supabaseAdmin.from('webhook_events').select('id').gte('created_at', since).ilike('type', 'cron_%'),
  ]);

  res.status(200).json({
    ok: true,
    webhookErrors: webhookErrors || [],
    recentCronEvents: (cronEvents || []).length,
  });
}
