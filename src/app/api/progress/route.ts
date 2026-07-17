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
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = userData.user.id;

    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episode_id');
    const type = searchParams.get('type') || 'all';

    if (episodeId) {
      const { data, error } = await supabase
        .from('listening_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('episode_id', episodeId)
        .single();

      if (error && error.code !== 'PGRST116') {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ progress: data || null });
    }

    if (type === 'continue') {
      const { data, error } = await supabase
        .from('listening_progress')
        .select(`
          episode_id, podcast_id, position_seconds, duration_seconds, completed, last_listened_at,
          episodes(id, title_en, title_rw, cover_image_url, duration_seconds, audio_url, status),
          podcasts(id, title_en, title_rw, cover_image_url)
        `)
        .eq('user_id', userId)
        .eq('completed', false)
        .gt('position_seconds', 30)
        .order('last_listened_at', { ascending: false })
        .limit(10);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ items: data || [] });
    }

    if (type === 'recent') {
      const { data, error } = await supabase
        .from('listening_progress')
        .select(`
          episode_id, podcast_id, position_seconds, duration_seconds, completed, last_listened_at,
          episodes(id, title_en, title_rw, cover_image_url, duration_seconds, audio_url, status),
          podcasts(id, title_en, title_rw, cover_image_url)
        `)
        .eq('user_id', userId)
        .order('last_listened_at', { ascending: false })
        .limit(20);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ items: data || [] });
    }

    const { data, error } = await supabase
      .from('listening_progress')
      .select(`
        episode_id, podcast_id, position_seconds, duration_seconds, completed, last_listened_at,
        episodes(id, title_en, title_rw, cover_image_url, duration_seconds, audio_url, status),
        podcasts(id, title_en, title_rw, cover_image_url)
      `)
      .eq('user_id', userId)
      .order('last_listened_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data || [] });
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
    const { episode_id, podcast_id, position_seconds, duration_seconds, completed } = body;

    if (!episode_id || position_seconds === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isCompleted = completed || (duration_seconds && position_seconds / duration_seconds >= 0.95);

    const { data, error } = await supabase
      .from('listening_progress')
      .upsert({
        user_id: userId,
        episode_id,
        podcast_id,
        position_seconds: Math.floor(position_seconds),
        duration_seconds: duration_seconds || null,
        completed: isCompleted || false,
        last_listened_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,episode_id',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ progress: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
