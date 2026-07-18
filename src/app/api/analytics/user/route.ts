import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const authz = request.headers.get('authorization') || request.headers.get('Authorization');
    const token = authz?.startsWith('Bearer ') ? authz.substring('Bearer '.length) : undefined;
    if (!token) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: userRes } = await userClient.auth.getUser();
    const userId = userRes?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Counts for completion metrics
    const { count: totalProgress } = await userClient
      .from('listening_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: episodesCompleted } = await userClient
      .from('listening_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('completed', true);

    const completionRate = totalProgress && totalProgress > 0
      ? Math.round(((episodesCompleted || 0) / totalProgress) * 100)
      : 0;

    // Listening history (recent)
    const { data: historyRows } = await userClient
      .from('listening_progress')
      .select('episode_id, last_listened_at, completed, episodes(title_en, title_rw, cover_image_url)')
      .eq('user_id', userId)
      .order('last_listened_at', { ascending: false })
      .limit(20);

    const history = (historyRows || []).map((r: any) => ({
      episode_id: r.episode_id,
      last_listened_at: r.last_listened_at,
      completed: r.completed,
      title_en: r.episodes?.title_en ?? null,
      title_rw: r.episodes?.title_rw ?? null,
      cover_image_url: r.episodes?.cover_image_url ?? null,
    }));

    // Monthly summary (completions per month over last 12 months)
    const since12Months = new Date();
    since12Months.setMonth(since12Months.getMonth() - 12);
    const { data: completedRows } = await userClient
      .from('listening_progress')
      .select('last_listened_at')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('last_listened_at', since12Months.toISOString());

    const monthlyMap = new Map<string, number>();
    (completedRows || []).forEach((r: any) => {
      const d = new Date(r.last_listened_at);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
    });
    const monthlySummary = Array.from(monthlyMap.entries())
      .map(([month, count]) => ({ month, completed: count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Listening activity (episode starts per day over last 30 days)
    const since30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { data: activityRows } = await userClient
      .from('playback_events')
      .select('created_at, event_type')
      .eq('user_id', userId)
      .gte('created_at', since30Days.toISOString());

    const dayMap = new Map<string, number>();
    (activityRows || [])
      .filter((e: any) => e.event_type === 'episode_started' || e.event_type === 'play_started')
      .forEach((e: any) => {
        const d = new Date(e.created_at);
        if (isNaN(d.getTime())) return;
        const key = d.toISOString().slice(0, 10);
        dayMap.set(key, (dayMap.get(key) || 0) + 1);
      });
    const activityByDay = Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      episodesCompleted: episodesCompleted || 0,
      totalProgress: totalProgress || 0,
      completionRate,
      activityByDay,
      monthlySummary,
      history,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
