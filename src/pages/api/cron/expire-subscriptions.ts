import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseAdmin) return res.status(200).json({ ok: true, note: 'no-admin-client' });

  const now = new Date().toISOString();
  console.log('[expire-subscriptions] cron started at', now);

  const { data: expired, error } = await supabaseAdmin
    .from('user_subscriptions')
    .select('id, user_id, expires_at, status')
    .eq('status', 'active')
    .lte('expires_at', now);

  if (error) {
    console.error('[expire-subscriptions] query error', error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }

  const reviewed = expired?.length || 0;
  console.log('[expire-subscriptions] reviewed', reviewed, 'subscriptions with status=active and expires_at<=', now);

  if (!expired || expired.length === 0) {
    console.log('[expire-subscriptions] no subscriptions to expire');
    return res.status(200).json({ ok: true, expired: 0 });
  }

  let updated = 0;
  for (const sub of expired) {
    const { error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update({ status: 'expired' })
      .eq('id', (sub as any).id)
      .eq('status', 'active')
      .lte('expires_at', now);

    if (updateError) {
      console.warn('[expire-subscriptions] update error for', (sub as any).id, updateError.message);
    } else {
      updated++;
    }
  }

  try {
    await supabaseAdmin.from('webhook_events').insert({
      provider: 'ops',
      type: 'cron_expire_subscriptions',
      payload: { reviewed, updated, runAt: now },
    });
  } catch {}

  console.log('[expire-subscriptions] done: reviewed', reviewed, 'updated', updated);
  res.status(200).json({ ok: true, reviewed, updated });
}
