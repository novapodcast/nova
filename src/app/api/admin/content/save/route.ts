import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdmin, getAdminClient } from '@/lib/auth/admin';

type SaveBody = {
  id?: string | null;
  podcast_id?: string | null;
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
  access_tier_id?: string | null;
  language?: 'en' | 'rw';
  categories?: string[];
};

export async function POST(request: NextRequest) {
  try {
    const authz = request.headers.get('authorization') || request.headers.get('Authorization');
    const token = authz?.startsWith('Bearer ') ? authz.substring('Bearer '.length) : undefined;
    if (!token) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }

    const { isAdmin, adminClient, userClient } = await verifyAdmin(token);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as SaveBody;
    const titleAny = body.title_en || body.title_rw;
    if (!titleAny) {
      return NextResponse.json({ error: 'Missing title_en or title_rw' }, { status: 400 });
    }
    if (!body.podcast_id) {
      return NextResponse.json({ error: 'Missing podcast_id' }, { status: 400 });
    }

    const clientForWrite = getAdminClient(adminClient, userClient);

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

    const writePayload: any = {
      podcast_id: body.podcast_id,
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
      audio_url: str(body.audio_url),
      cover_image_url: str(body.cover_image_url),
      duration_seconds: body.duration_seconds ?? null,
      is_premium: body.is_premium ?? false,
      access_tier_id: body.access_tier_id || null,
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

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
