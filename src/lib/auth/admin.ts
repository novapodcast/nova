import { createClient } from '@supabase/supabase-js';

const DEFAULT_ADMIN_EMAILS = ['admin@nova.co.rw', 'novapodcast2019@gmail.com'];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
  const list = Array.from(new Set([...(raw ? raw.split(',') : []), ...DEFAULT_ADMIN_EMAILS]))
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function verifyAdmin(token: string): Promise<{ isAdmin: boolean; userId: string | null; email: string | null; adminClient: any; userClient: any }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { isAdmin: false, userId: null, email: null, adminClient: null, userClient: null };
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const adminClient = serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    : null;

  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user?.id) {
    return { isAdmin: false, userId: null, email: null, adminClient, userClient };
  }

  const userId = userRes.user.id;
  const email = userRes.user.email || null;

  let isAdmin = false;
  const clientForRead = adminClient ?? userClient;

  const { data: profile } = await clientForRead
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  if (profile?.is_admin) isAdmin = true;
  if (!isAdmin) isAdmin = isAdminEmail(email);

  return { isAdmin, userId, email, adminClient, userClient };
}

export function getAdminClient(adminClient: any, userClient: any): any {
  return adminClient ?? userClient;
}
