import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdmin, getAdminClient } from '@/lib/auth/admin';

type SaveBody = {
  id?: string | null;
  title_en?: string;
  title_rw?: string;
  description_en?: string | null;
  description_rw?: string | null;
  cover_image_url?: string | null;
  category_id?: string | null;
  speaker_name?: string;
  is_active?: boolean;
  access_tier_id?: string | null;
  slug?: string | null;
  status?: 'draft' | 'scheduled' | 'published' | 'archived';
  scheduled_at?: string | null;
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

    const clientForWrite = getAdminClient(adminClient, userClient);
    const body = (await request.json()) as SaveBody;
    const str = (v: string | null | undefined) => (v && v.trim()) ? v.trim() : null;

    // Validate: at least one title must be provided
    const titleEn = str(body.title_en);
    const titleRw = str(body.title_rw);
    
    if (!titleEn && !titleRw) {
      return NextResponse.json({ 
        error: 'Please provide at least one title (English or Kinyarwanda)' 
      }, { status: 400 });
    }

    // Auto-populate missing title with the provided one
    const finalTitleEn = titleEn || titleRw || 'Untitled';
    const finalTitleRw = titleRw || titleEn || 'Ntacyo yiswe';

    // Resolve access_tier_id — default to Free tier if not provided
    let accessTierId = body.access_tier_id || null;
    if (!accessTierId) {
      const { data: freeTier } = await clientForWrite
        .from('pricing_tiers')
        .select('id')
        .eq('plan_name', 'Free')
        .limit(1)
        .single();
      accessTierId = freeTier?.id || null;
    }

    const writePayload: any = {
      title_en: finalTitleEn,
      title_rw: finalTitleRw,
      description_en: str(body.description_en),
      description_rw: str(body.description_rw),
      cover_image_url: body.cover_image_url || '',
      category_id: body.category_id || null,
      speaker_name: body.speaker_name || '',
      is_active: body.is_active ?? true,
      access_tier_id: accessTierId,
      slug: str(body.slug),
      status: body.status || 'published',
      scheduled_at: body.scheduled_at || null,
    };

    if (body.id) {
      const { data: existing, error: fetchErr } = await clientForWrite
        .from('podcasts')
        .select('is_system')
        .eq('id', body.id)
        .single();

      if (fetchErr) {
        return NextResponse.json({ error: fetchErr.message }, { status: 400 });
      }

      if (existing?.is_system) {
        return NextResponse.json({ error: 'System podcasts cannot be modified.' }, { status: 403 });
      }

      writePayload.updated_at = new Date().toISOString();
      const { error: updateErr } = await clientForWrite
        .from('podcasts')
        .update(writePayload)
        .eq('id', body.id);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 400 });
      }
    } else {
      writePayload.is_system = false;
      writePayload.created_at = new Date().toISOString();
      writePayload.updated_at = new Date().toISOString();
      const { data: insertData, error: insertErr } = await clientForWrite
        .from('podcasts')
        .insert(writePayload)
        .select('id');

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 400 });
      }
      if (!insertData || insertData.length === 0) {
        return NextResponse.json({ 
          error: 'Insert was blocked by RLS. Check that SUPABASE_SERVICE_ROLE_KEY is set and podcasts RLS policies are in place.' 
        }, { status: 403 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
