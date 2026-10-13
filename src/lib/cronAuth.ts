import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Fail-closed CRON_SECRET authentication for Vercel scheduled jobs.
 *
 * Vercel automatically sends `Authorization: Bearer $CRON_SECRET` on every
 * scheduled invocation when the env var is configured, so this check is
 * compatible with existing vercel.json crons.
 *
 * Unlike the inline check in reconcile-payments.ts, a missing CRON_SECRET
 * fails CLOSED (503) — protection can never be silently disabled by a
 * missing environment variable.
 *
 * Usage: `if (!verifyCronRequest(req, res)) return;` as the first line of
 * the handler, before any side effects.
 */
export function verifyCronRequest(req: NextApiRequest, res: NextApiResponse): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    res.status(503).json({ error: 'Cron authentication not configured' });
    return false;
  }
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}
