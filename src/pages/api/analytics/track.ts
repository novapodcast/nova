import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { event, properties, ts, userId, device, platform } = req.body || {};
    if (!event) return res.status(400).json({ error: 'Missing event' });

    if (!supabaseAdmin) return res.status(200).json({ ok: true, note: 'no-admin-client' });

    const { error } = await supabaseAdmin.from('analytics_events').insert({
      user_id: userId || null,
      event,
      properties: properties || {},
      ts: ts ? new Date(ts).toISOString() : new Date().toISOString(),
      device: device || null,
      platform: platform || 'mobile',
    });
    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to log event' });
  }
}
