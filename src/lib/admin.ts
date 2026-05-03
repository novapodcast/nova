export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
  const defaults = ['admin@nova.co.rw', 'novapodcast2019@gmail.com'];
  const list = Array.from(new Set([...(raw ? raw.split(',') : []), ...defaults]))
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function getIsAdminServer(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    // Lazy import to avoid client bundle weight if used in server contexts only.
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || !key) return false;
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).single();
    return !!data?.is_admin;
  } catch {
    return false;
  }
}
