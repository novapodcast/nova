import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function isAdminEmailServer(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
  const defaults = ['admin@nova.co.rw', 'novapodcast2019@gmail.com'];
  const list = Array.from(new Set([...(raw ? raw.split(',') : []), ...defaults]))
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

type SaveBody = {
  id?: string | null;
  title_en?: string;
  title_rw?: string;
  description_en?: string;
  description_rw?: string;
  slug?: string | null;
  status?: 'draft' | 'scheduled' | 'published';
  scheduled_at?: string | null;
  meta_title_en?: string | null;
  meta_title_rw?: string | null;
  meta_description_en?: string | null;
  meta_description_rw?: string | null;
  og_image_url?: string | null;
  audio_url?: string | null;
  cover_image_url?: string | null;
  duration_seconds?: number | null;
  is_premium?: boolean;
  categories?: string[];
};

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

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const admin = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }) : null;

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    if (!isAdmin && userRes.user.email) {
      isAdmin = isAdminEmailServer(userRes.user.email);
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as SaveBody;
    const titleAny = body.title_en || body.title_rw;
    if (!titleAny) {
      return NextResponse.json({ error: 'Missing title_en or title_rw' }, { status: 400 });
    }

    const clientForWrite = admin ?? supabase;

    const slug = (body.slug && body.slug.trim()) ? body.slug.trim() : (titleAny || '')
      .toLowerCase()
      .normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || null;

    const writePayload: any = {
      title_en: body.title_en ?? null,
      title_rw: body.title_rw ?? null,
      description_en: body.description_en ?? null,
      description_rw: body.description_rw ?? null,
      slug,
      status: body.status || 'draft',
      scheduled_at: body.scheduled_at ?? null,
      meta_title_en: body.meta_title_en ?? null,
      meta_title_rw: body.meta_title_rw ?? null,
      meta_description_en: body.meta_description_en ?? null,
      meta_description_rw: body.meta_description_rw ?? null,
      og_image_url: body.og_image_url ?? null,
      audio_url: body.audio_url ?? null,
      cover_image_url: body.cover_image_url ?? null,
      duration_seconds: body.duration_seconds ?? null,
      is_premium: body.is_premium ?? false,
      categories: body.categories ?? [],
    };

    if (body.id) {
      const { error: updateErr } = await clientForWrite
        .from('episodes')
        .update(writePayload)
        .eq('id', body.id);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 400 });
      }
    } else {
      const { error: insertErr } = await clientForWrite
        .from('episodes')
        .insert(writePayload);

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
