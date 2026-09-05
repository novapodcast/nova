import { supabaseAdmin } from './supabaseAdmin';

export async function logPaymentEvent(type: string, payload: Record<string, any>): Promise<void> {
  const sanitized = { ...payload };
  delete sanitized.token;
  delete sanitized.accessToken;
  delete sanitized.serviceKey;
  delete sanitized.consumerKey;
  delete sanitized.consumerSecret;
  delete sanitized.authorization;

  console.log(`[payment][${type}]`, JSON.stringify(sanitized));

  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.from('webhook_events').insert({
      provider: 'pesapal',
      type,
      payload: sanitized,
    });
  } catch {}
}
