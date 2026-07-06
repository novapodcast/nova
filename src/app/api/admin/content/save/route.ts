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

type AudioFile = {
  id?: string;
  audio_url: string;
  duration_seconds: number;
  language: 'en' | 'rw';
  label: string;
  sort_order: number;
};

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
  language?: 'en' | 'rw';
  categories?: string[];
  audio_files?: AudioFile[];
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

    const str = (v: string | null | undefined) => (v && v.trim()) ? v.trim() : null;

    const toNullableIso = (v: unknown) => {
      if (typeof v !== 'string') return null;
      const s = v.trim();
      if (!s) return null;
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return null;
      return d.toISOString();
    };

    const audioFiles = (body.audio_files || []).filter((af) => af.audio_url && af.audio_url.trim());
    const primaryAudio = audioFiles.length > 0 ? audioFiles[0] : null;

    const writePayload: any = {
      title_en: str(body.title_en),
      title_rw: str(body.title_rw),
      description_en: str(body.description_en),
      description_rw: str(body.description_rw),
      slug,
      status: body.status || 'draft',
      scheduled_at: toNullableIso(body.scheduled_at),
      meta_title_en: str(body.meta_title_en),
      meta_title_rw: str(body.meta_title_rw),
      meta_description_en: str(body.meta_description_en),
      meta_description_rw: str(body.meta_description_rw),
      og_image_url: str(body.og_image_url),
      audio_url: primaryAudio ? primaryAudio.audio_url : str(body.audio_url),
      cover_image_url: str(body.cover_image_url),
      duration_seconds: primaryAudio ? primaryAudio.duration_seconds : (body.duration_seconds ?? null),
      is_premium: body.is_premium ?? false,
      language: body.language ?? 'rw',
      categories: body.categories ?? [],
    };

    let episodeId: string | null = null;

    if (body.id) {
      const { error: updateErr } = await clientForWrite
        .from('episodes')
        .update(writePayload)
        .eq('id', body.id);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 400 });
      }
      episodeId = body.id;
    } else {
      const { data: inserted, error: insertErr } = await clientForWrite
        .from('episodes')
        .insert(writePayload)
        .select('id')
        .single();

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 400 });
      }
      episodeId = inserted?.id ?? null;
    }

    // Sync episode_contents (audio tracks)
    if (episodeId && audioFiles.length > 0) {
      // Delete existing contents and re-insert (simple sync strategy)
      await clientForWrite
        .from('episode_contents')
        .delete()
        .eq('episode_id', episodeId);

      const contentsRows = audioFiles.map((af, index) => ({
        episode_id: episodeId,
        audio_url: af.audio_url,
        duration_seconds: af.duration_seconds ?? 0,
        language: af.language || 'rw',
        label: af.label || null,
        sort_order: typeof af.sort_order === 'number' ? af.sort_order : index,
      }));

      const { error: contentsErr } = await clientForWrite
        .from('episode_contents')
        .insert(contentsRows);

      if (contentsErr) {
        console.error('episode_contents sync error:', contentsErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
