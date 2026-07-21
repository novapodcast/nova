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

    const since90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // 1. Find user's top podcast from playback history
    const { data: topEvents } = await userClient
      .from('playback_events')
      .select('podcast_id, episode_id')
      .eq('user_id', userId)
      .eq('event_type', 'episode_started')
      .not('podcast_id', 'is', null)
      .gte('created_at', since90Days.toISOString())
      .limit(500);

    const podcastCounts = new Map<string, number>();
    const listenedEpisodeIds = new Set<string>();
    (topEvents || []).forEach((e: any) => {
      if (e.podcast_id) podcastCounts.set(e.podcast_id, (podcastCounts.get(e.podcast_id) || 0) + 1);
      if (e.episode_id) listenedEpisodeIds.add(e.episode_id);
    });

    const topPodcastEntry = Array.from(podcastCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    const topPodcastId = topPodcastEntry?.[0];

    // 2. Get episodes already in listening_progress (to exclude)
    const { data: progressRows } = await userClient
      .from('listening_progress')
      .select('episode_id')
      .eq('user_id', userId);
    (progressRows || []).forEach((r: any) => listenedEpisodeIds.add(r.episode_id));

    const groups: {
      titleKey: string;
      titleParams?: Record<string, any>;
      episodes: any[];
    }[] = [];

    // Group 1: "Because you listened to..." — more from top podcast
    if (topPodcastId) {
      const { data: podInfo } = await userClient
        .from('podcasts')
        .select('title_en, title_rw')
        .eq('id', topPodcastId)
        .single();

      const { data: moreEpisodes } = await userClient
        .from('episodes')
        .select('id, title_en, title_rw, cover_image_url, duration_seconds, podcast_id, podcasts(id, title_en, title_rw, cover_image_url)')
        .eq('podcast_id', topPodcastId)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(4);

      const filtered = (moreEpisodes || []).filter((e: any) => !listenedEpisodeIds.has(e.id));
      if (filtered.length > 0) {
        groups.push({
          titleKey: 'dashboard.recBecauseYouListened',
          titleParams: { name: podInfo?.title_en || podInfo?.title_rw || '' },
          episodes: filtered.slice(0, 4),
        });
      }
    }

    // Group 2: "New from creators you follow"
    const { data: follows } = await userClient
      .from('podcast_follows')
      .select('podcast_id')
      .eq('user_id', userId);

    if (follows && follows.length > 0) {
      const followedIds = follows.map((f: any) => f.podcast_id).filter((id: string) => !podcastCounts.has(id));
      if (followedIds.length > 0) {
        const { data: newFromFollows } = await userClient
          .from('episodes')
          .select('id, title_en, title_rw, cover_image_url, duration_seconds, podcast_id, podcasts(id, title_en, title_rw, cover_image_url)')
          .in('podcast_id', followedIds.slice(0, 10))
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(8);

        const filtered = (newFromFollows || []).filter((e: any) => !listenedEpisodeIds.has(e.id));
        if (filtered.length > 0) {
          groups.push({
            titleKey: 'dashboard.recNewFromFollows',
            episodes: filtered.slice(0, 4),
          });
        }
      }
    }

    // Group 3: "Trending in your favorite category"
    if (topPodcastId) {
      const { data: topPod } = await userClient
        .from('podcasts')
        .select('category_id')
        .eq('id', topPodcastId)
        .single();

      if (topPod?.category_id) {
        const { data: categoryPodcasts } = await userClient
          .from('podcasts')
          .select('id')
          .eq('category_id', topPod.category_id)
          .neq('id', topPodcastId)
          .limit(20);

        if (categoryPodcasts && categoryPodcasts.length > 0) {
          const catPodcastIds = categoryPodcasts.map((p: any) => p.id);
          const { data: trendingEps } = await userClient
            .from('episodes')
            .select('id, title_en, title_rw, cover_image_url, duration_seconds, podcast_id, podcasts(id, title_en, title_rw, cover_image_url)')
            .in('podcast_id', catPodcastIds)
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(8);

          const filtered = (trendingEps || []).filter((e: any) => !listenedEpisodeIds.has(e.id));
          if (filtered.length > 0) {
            groups.push({
              titleKey: 'dashboard.recTrendingCategory',
              episodes: filtered.slice(0, 4),
            });
          }
        }
      }
    }

    // Fallback: latest published episodes if no recommendations yet
    if (groups.length === 0) {
      const { data: latestEps } = await userClient
        .from('episodes')
        .select('id, title_en, title_rw, cover_image_url, duration_seconds, podcast_id, podcasts(id, title_en, title_rw, cover_image_url)')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(4);

      const filtered = (latestEps || []).filter((e: any) => !listenedEpisodeIds.has(e.id));
      if (filtered.length > 0) {
        groups.push({
          titleKey: 'dashboard.recLatestEpisodes',
          episodes: filtered,
        });
      }
    }

    return NextResponse.json({ groups });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
