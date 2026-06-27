import type { NextApiRequest, NextApiResponse } from 'next';
import { activateOrExtendSubscription } from '../../../lib/subscriptions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = (req.query.userId as string) || '';
  const amount = parseInt((req.query.amount as string) || '100', 10);
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const subscription = await activateOrExtendSubscription(userId, amount, 1);
  if (!subscription) {
    return res.status(500).json({ error: 'Failed to activate or extend subscription' });
  }

  return res.status(200).json({ ok: true, subscription });
}
