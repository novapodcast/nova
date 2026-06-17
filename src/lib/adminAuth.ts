import type { NextApiRequest } from 'next';
import { supabaseAdmin } from './supabaseAdmin';

/**
 * Verify that the request is from an admin user
 * Checks for either:
 * 1. Service role key (for server-side operations like webhooks/crons)
 * 2. Admin user JWT (for manual admin dashboard access)
 */
export async function verifyAdmin(req: NextApiRequest): Promise<{ authorized: boolean; userId?: string; error?: string }> {
  // Service role bypass (for webhooks, cron jobs, etc.)
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring('Bearer '.length);
    // Check if it's the service role key (simple check - in production, verify properly)
    if (token === process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { authorized: true };
    }
  }

  // Check for admin user JWT
  if (!supabaseAdmin) {
    return { authorized: false, error: 'Admin client not configured' };
  }

  try {
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') 
      ? authHeader.substring('Bearer '.length) 
      : null;

    if (!token) {
      return { authorized: false, error: 'Missing authorization token' };
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return { authorized: false, error: 'Invalid token' };
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.is_admin) {
      return { authorized: false, error: 'User is not an admin' };
    }

    return { authorized: true, userId: user.id };
  } catch (e: any) {
    return { authorized: false, error: e?.message || 'Authorization failed' };
  }
}
