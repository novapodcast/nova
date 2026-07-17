import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const authz = request.headers.get('authorization') || request.headers.get('Authorization');
    const token = authz?.startsWith('Bearer ') ? authz.substring('Bearer '.length) : undefined;

    let userId: string | null = null;

    if (token) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });

      const { data: userRes } = await userClient.auth.getUser();
      if (userRes?.user?.id) {
        userId = userRes.user.id;
      }
    }

    const body = await request.json();
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { error } = await adminClient.from('playback_events').insert({
      user_id: userId,
      episode_id: body.episode_id || null,
      podcast_id: body.podcast_id || null,
      event_type: body.event_type,
      position_seconds: body.position_seconds || null,
      duration_seconds: body.duration_seconds || null,
      playback_speed: body.playback_speed || 1.0,
      plan_gate_hit: body.plan_gate_hit || false,
      upgrade_prompt_shown: body.upgrade_prompt_shown || false,
      upgrade_converted: body.upgrade_converted || false,
      user_tier_rank: body.user_tier_rank || 0,
      content_tier_rank: body.content_tier_rank || 0,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
