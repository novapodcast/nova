import type { NextApiRequest, NextApiResponse } from 'next';
import { registerIPN, isDemo } from '../../../lib/pesapal';
import { logPaymentEvent } from '../../../lib/paymentLog';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { url, ipnType } = req.body || {};
    if (!url) return res.status(400).json({ error: 'Missing url' });

    if (isDemo) {
      const demoId = `DEMO-IPN-${Date.now()}`;
      await logPaymentEvent('ipn_register_success', { ipnType: ipnType || 'GET', demo: true });
      return res.status(200).json({ ipnId: demoId, demo: true });
    }

    let ipnId: string;
    try {
      ipnId = await registerIPN(url, ipnType || 'GET');
    } catch (regErr: any) {
      await logPaymentEvent('ipn_register_failed', {
        ipnType: ipnType || 'GET',
        error: regErr?.message || 'Unknown registration error',
      });
      return res.status(502).json({
        error: `IPN registration failed: ${regErr?.message || 'unknown'}`,
      });
    }

    if (!ipnId || typeof ipnId !== 'string' || ipnId.trim() === '') {
      await logPaymentEvent('ipn_register_empty', { ipnType: ipnType || 'GET' });
      return res.status(502).json({
        error: 'IPN registration returned an empty notification ID. Payment cannot proceed safely.',
      });
    }

    await logPaymentEvent('ipn_register_success', { ipnType: ipnType || 'GET' });
    res.status(200).json({ ipnId });
  } catch (e: any) {
    await logPaymentEvent('ipn_register_error', { error: e?.message || 'Unknown error' });
    res.status(500).json({ error: e?.message || 'Failed to register IPN' });
  }
}
