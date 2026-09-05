import type { NextApiRequest } from 'next';
import { supabaseAdmin } from './supabaseAdmin';
import { logPaymentEvent } from './paymentLog';

/**
 * Verify that the request is from an admin user.
 * Requires a valid Supabase JWT from an authenticated admin user.
 * The service role key is NOT accepted as an HTTP credential.
 */
export async function verifyAdmin(req: NextApiRequest): Promise<{ authorized: boolean; userId?: string; error?: string }> {
  if (!supabaseAdmin) {
    await logPaymentEvent('admin_auth_failed', { action: 'verifyAdmin', reason: 'admin_client_not_configured', timestamp: new Date().toISOString() });
    return { authorized: false, error: 'Admin client not configured' };
  }

  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') 
      ? authHeader.substring('Bearer '.length) 
      : null;

    if (!token) {
      await logPaymentEvent('admin_auth_failed', { action: 'verifyAdmin', reason: 'missing_token', timestamp: new Date().toISOString() });
      return { authorized: false, error: 'Missing authorization token' };
    }

    // Verify the JWT is a valid Supabase auth token
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      await logPaymentEvent('admin_auth_failed', { action: 'verifyAdmin', reason: 'invalid_token', timestamp: new Date().toISOString() });
      return { authorized: false, error: 'Invalid token' };
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.is_admin) {
      await logPaymentEvent('admin_auth_failed', { action: 'verifyAdmin', reason: 'not_admin', userId: user.id, timestamp: new Date().toISOString() });
      return { authorized: false, error: 'User is not an admin' };
    }

    return { authorized: true, userId: user.id };
  } catch (e: any) {
    await logPaymentEvent('admin_auth_failed', { action: 'verifyAdmin', reason: 'exception', error: e?.message || 'unknown', timestamp: new Date().toISOString() });
    return { authorized: false, error: e?.message || 'Authorization failed' };
  }
}
