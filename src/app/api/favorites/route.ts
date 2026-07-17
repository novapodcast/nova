import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const authz = request.headers.get('authorization') || request.headers.get('Authorization');
    const token = authz?.startsWith('Bearer ') ? authz.substring('Bearer '.length) : undefined;
    if (!token) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = userData.user.id;

    const { data, error } = await supabase
      .from('favorites')
      .select(`
        episode_id, favorited_at,
        episodes(id, title_en, title_rw, description_en, description_rw, cover_image_url, duration_seconds, audio_url, status, podcast_id,
          podcasts(id, title_en, title_rw, cover_image_url)
        )
      `)
      .eq('user_id', userId)
      .order('favorited_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ favorites: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
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

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = userData.user.id;

    const body = await request.json();
    const { episode_id, action } = body;

    if (!episode_id) {
      return NextResponse.json({ error: 'Missing episode_id' }, { status: 400 });
    }

    if (action === 'remove') {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('episode_id', episode_id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ favorited: false });
    }

    const { error } = await supabase
      .from('favorites')
      .upsert({
        user_id: userId,
        episode_id,
        favorited_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,episode_id',
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ favorited: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
