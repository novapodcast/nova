import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type UpdateBody = {
  id: string;
  display_name_en?: string;
  display_name_rw?: string;
  price_rwf?: number;
  savings_rwf?: number;
  features_en?: string[];
  features_rw?: string[];
  is_highlighted?: boolean;
  is_active?: boolean;
};

function isAdminEmailServer(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
  const defaults = ['admin@nova.co.rw', 'novapodcast2019@gmail.com'];
  const list = Array.from(new Set([...(raw ? raw.split(',') : []), ...defaults]))
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function POST(request: NextRequest) {
  try {
    const authz = request.headers.get('authorization') || request.headers.get('Authorization');
    const token = authz?.startsWith('Bearer ') ? authz.substring('Bearer '.length) : undefined;
    if (!token) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase env not configured' }, { status: 500 });
    }

    // User client: only to identify caller by bearer token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // Admin client: to bypass RLS for privileged checks and writes
    const admin = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }) : null;

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Primary check: server-side role flag (prefer service role to avoid RLS issues)
    let isAdmin = false;
    if (admin) {
      const { data: profile } = await admin
        .from('profiles')
        .select('is_admin')
        .eq('id', userRes.user.id)
        .single();
      if (profile?.is_admin) isAdmin = true;
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userRes.user.id)
        .single();
      if (profile?.is_admin) isAdmin = true;
    }

    // Fallback: email allowlist (to avoid lockout before flag is set)
    if (!isAdmin && userRes.user.email) {
      isAdmin = isAdminEmailServer(userRes.user.email);
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as UpdateBody;
    if (!body?.id) {
      return NextResponse.json({ error: 'Missing pricing tier id' }, { status: 400 });
    }

    const clientForWrite = admin ?? supabase;
    const { error: updateErr } = await clientForWrite
      .from('pricing_tiers')
      .update({
        display_name_en: body.display_name_en,
        display_name_rw: body.display_name_rw,
        price_rwf: body.price_rwf,
        savings_rwf: body.savings_rwf,
        features_en: body.features_en,
        features_rw: body.features_rw,
        is_highlighted: body.is_highlighted,
        is_active: body.is_active,
      })
      .eq('id', body.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
