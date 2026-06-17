import type { NextApiRequest, NextApiResponse } from 'next';
import { getTransactionStatus } from '../../../lib/pesapal';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const orderTrackingId = (req.query.orderTrackingId as string) || (req.body?.orderTrackingId as string);
    if (!orderTrackingId) return res.status(400).json({ error: 'Missing orderTrackingId' });
    const status = await getTransactionStatus(orderTrackingId);
    res.status(200).json(status);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to get status' });
  }
}
