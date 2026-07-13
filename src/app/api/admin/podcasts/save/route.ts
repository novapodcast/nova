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
  description_en?: string | null;
  description_rw?: string | null;
  cover_image_url?: string | null;
  category_id?: string | null;
  speaker_name?: string;
  is_active?: boolean;
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
    const clientForWrite = admin ?? supabase;
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

    const writePayload: any = {
      title_en: finalTitleEn,
      title_rw: finalTitleRw,
      description_en: str(body.description_en),
      description_rw: str(body.description_rw),
      cover_image_url: body.cover_image_url || '',
      category_id: body.category_id || null,
      speaker_name: body.speaker_name || '',
      is_active: body.is_active ?? true,
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
      const { error: insertErr } = await clientForWrite
        .from('podcasts')
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
