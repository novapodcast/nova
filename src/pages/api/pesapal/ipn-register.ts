import type { NextApiRequest, NextApiResponse } from 'next';
import { registerIPN } from '../../../lib/pesapal';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { url, ipnType } = req.body || {};
    if (!url) return res.status(400).json({ error: 'Missing url' });
    const id = await registerIPN(url, ipnType || 'GET');
    res.status(200).json({ ipnId: id });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to register IPN' });
  }
}
