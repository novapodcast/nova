import type { NextApiRequest, NextApiResponse } from 'next';
import { isDemo } from '../../../lib/pesapal';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    if (isDemo) return res.status(200).json({ token: 'demo-token', demo: true });
    const r = await axios.post('https://pay.pesapal.com/v3/api/Auth/RequestToken', {
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    }, { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } });
    res.status(200).json({ token: r.data.token });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to get token' });
  }
}
