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

    // Date ranges
    const now = new Date();
    const since30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const since7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const since14Days = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const since90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const since12Months = new Date();
    since12Months.setMonth(since12Months.getMonth() - 12);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const lastMonthStart = new Date();
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    lastMonthStart.setDate(1);
    lastMonthStart.setHours(0, 0, 0, 0);

    // Batch parallel queries
    const [
      totalProgressRes, episodesCompletedRes, historyRes, completedRowsRes,
      continueRes, activityRes, topContentRes, episodesStartedRes,
      listensRes, weekActivityRes,
    ] = await Promise.all([
      userClient.from('listening_progress').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      userClient.from('listening_progress').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('completed', true),
      userClient.from('listening_progress')
        .select('episode_id, last_listened_at, completed, episodes(title_en, title_rw, cover_image_url, podcast_id, podcasts(title_en, title_rw, cover_image_url))')
        .eq('user_id', userId).order('last_listened_at', { ascending: false }).limit(20),
      userClient.from('listening_progress').select('last_listened_at').eq('user_id', userId).eq('completed', true).gte('last_listened_at', since12Months.toISOString()),
      userClient.from('listening_progress')
        .select('episode_id, podcast_id, position_seconds, duration_seconds, last_listened_at, episodes!inner(id, title_en, title_rw, cover_image_url, duration_seconds, podcasts(id, title_en, title_rw, cover_image_url))')
        .eq('user_id', userId).eq('completed', false).gt('position_seconds', 30).order('last_listened_at', { ascending: false }).limit(5),
      userClient.from('playback_events').select('created_at, event_type, position_seconds').eq('user_id', userId).gte('created_at', since30Days.toISOString()),
      userClient.from('playback_events')
        .select('podcast_id, created_at, podcasts!inner(id, title_en, title_rw, cover_image_url, speaker_name, category_id)')
        .eq('user_id', userId).eq('event_type', 'episode_started').not('podcast_id', 'is', null).gte('created_at', since90Days.toISOString()).limit(500),
      userClient.from('playback_events').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('event_type', 'episode_started'),
      // Canonical source for actual listening duration
      userClient.from('listens').select('duration_seconds, created_at').eq('user_id', userId).gte('created_at', since14Days.toISOString()).limit(2000),
      userClient.from('playback_events').select('created_at, event_type, position_seconds').eq('user_id', userId).eq('event_type', 'episode_started').gte('created_at', since14Days.toISOString()),
    ]);

    // --- Listen duration rows (canonical source: listens table) ---
    const listenRows = (listensRes.data || []) as any[];

    // --- Completion metrics ---
    const totalProgress = totalProgressRes.count || 0;
    const episodesCompleted = episodesCompletedRes.count || 0;
    const completionRate = totalProgress > 0 ? Math.round((episodesCompleted / totalProgress) * 100) : 0;

    // --- History ---
    const history = (historyRes.data || []).map((r: any) => ({
      episode_id: r.episode_id,
      last_listened_at: r.last_listened_at,
      completed: r.completed,
      title_en: r.episodes?.title_en ?? null,
      title_rw: r.episodes?.title_rw ?? null,
      cover_image_url: r.episodes?.cover_image_url ?? null,
    }));

    // --- Monthly summary ---
    const monthlyMap = new Map<string, number>();
    (completedRowsRes.data || []).forEach((r: any) => {
      const d = new Date(r.last_listened_at);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
    });
    const monthlySummary = Array.from(monthlyMap.entries())
      .map(([month, count]) => ({ month, completed: count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // --- Activity (30 days) ---
    const activityRows = (activityRes.data || []) as any[];
    const startedEvents = activityRows.filter(
      (e) => e.event_type === 'episode_started' || e.event_type === 'play_started'
    );
    const dayMap = new Map<string, number>();
    startedEvents.forEach((e) => {
      const d = new Date(e.created_at);
      if (isNaN(d.getTime())) return;
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, (dayMap.get(key) || 0) + 1);
    });
    const activityByDay = Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // --- Streaks ---
    const listeningDays = new Set(activityByDay.map((a) => a.date));
    const todayStr = now.toISOString().slice(0, 10);
    const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
    let currentStreak = 0;
    if (listeningDays.has(todayStr) || listeningDays.has(yesterdayStr)) {
      let checkDate = listeningDays.has(todayStr) ? new Date(now) : new Date(now.getTime() - 86400000);
      while (listeningDays.has(checkDate.toISOString().slice(0, 10))) {
        currentStreak++;
        checkDate = new Date(checkDate.getTime() - 86400000);
      }
    }
    const sortedDays = Array.from(listeningDays).sort();
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate: Date | null = null;
    for (const dayStr of sortedDays) {
      const d = new Date(dayStr);
      if (prevDate) {
        const diff = (d.getTime() - prevDate.getTime()) / 86400000;
        if (diff === 1) tempStreak++;
        else tempStreak = 1;
      } else {
        tempStreak = 1;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
      prevDate = d;
    }

    // --- Minutes by period (from listens table — actual listening duration) ---
    const todayListenSeconds = listenRows
      .filter((r) => new Date(r.created_at) >= todayStart)
      .reduce((sum, r) => sum + (r.duration_seconds || 0), 0);
    const minutesToday = Math.round(todayListenSeconds / 60);

    const thisWeekListenSeconds = listenRows
      .filter((r) => new Date(r.created_at) >= since7Days)
      .reduce((sum, r) => sum + (r.duration_seconds || 0), 0);
    const lastWeekListenSeconds = listenRows
      .filter((r) => { const d = new Date(r.created_at); return d >= since14Days && d < since7Days; })
      .reduce((sum, r) => sum + (r.duration_seconds || 0), 0);
    const minutesThisWeek = Math.round(thisWeekListenSeconds / 60);

    // Fetch all-time listens for accurate month/lifetime totals
    const { data: allListensData } = await userClient
      .from('listens')
      .select('duration_seconds, created_at')
      .eq('user_id', userId)
      .limit(5000);

    const allListenRows = (allListensData || []) as any[];
    const monthListenSeconds = allListenRows
      .filter((r) => new Date(r.created_at) >= monthStart)
      .reduce((sum, r) => sum + (r.duration_seconds || 0), 0);
    const minutesThisMonth = Math.round(monthListenSeconds / 60);

    const lifetimeListenSeconds = allListenRows
      .reduce((sum, r) => sum + (r.duration_seconds || 0), 0);
    const minutesLifetime = Math.round(lifetimeListenSeconds / 60);

    // Use listen durations for week comparison (insights)
    const thisWeekSeconds = thisWeekListenSeconds;
    const lastWeekSeconds = lastWeekListenSeconds;

    // --- Weekly activity (last 7 days) ---
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyActivity: { day: string; count: number; minutes: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toISOString().slice(0, 10);
      const dayEvents = startedEvents.filter((e) => new Date(e.created_at).toISOString().slice(0, 10) === dateStr);
      weeklyActivity.push({
        day: dayLabels[d.getDay()],
        count: dayEvents.length,
        minutes: Math.round(listenRows
          .filter((r) => new Date(r.created_at).toISOString().slice(0, 10) === dateStr)
          .reduce((sum, r) => sum + (r.duration_seconds || 0), 0) / 60),
      });
    }

    // --- Top podcasts ---
    const podcastMap = new Map<string, { title_en: string; title_rw: string; cover_url: string | null; listen_count: number; speaker_name: string | null; category_id: string | null }>();
    (topContentRes.data || []).forEach((e: any) => {
      const pid = e.podcast_id;
      if (!pid || !e.podcasts) return;
      const existing = podcastMap.get(pid);
      if (existing) existing.listen_count++;
      else podcastMap.set(pid, {
        title_en: e.podcasts.title_en || '', title_rw: e.podcasts.title_rw || '',
        cover_url: e.podcasts.cover_image_url || null, listen_count: 1,
        speaker_name: e.podcasts.speaker_name || null, category_id: e.podcasts.category_id || null,
      });
    });
    const topPodcasts = Array.from(podcastMap.entries())
      .map(([podcast_id, d]) => ({ podcast_id, ...d, total_minutes: 0 }))
      .sort((a, b) => b.listen_count - a.listen_count)
      .slice(0, 5);

    // --- Top categories ---
    const categoryMap = new Map<string, number>();
    (topContentRes.data || []).forEach((e: any) => {
      const cid = e.podcasts?.category_id;
      if (!cid) return;
      categoryMap.set(cid, (categoryMap.get(cid) || 0) + 1);
    });
    let topCategories: { category: string; count: number }[] = [];
    if (categoryMap.size > 0) {
      const categoryIds = Array.from(categoryMap.keys());
      const { data: catData } = await userClient.from('categories').select('id, name_en, name_rw').in('id', categoryIds);
      const catNameMap = new Map<string, string>();
      (catData || []).forEach((c: any) => catNameMap.set(c.id, c.name_en || c.name_rw || c.id));
      topCategories = Array.from(categoryMap.entries())
        .map(([cid, count]) => ({ category: catNameMap.get(cid) || cid, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    }

    // --- Top speakers ---
    const speakerMap = new Map<string, number>();
    (topContentRes.data || []).forEach((e: any) => {
      const speaker = e.podcasts?.speaker_name;
      if (!speaker) return;
      speakerMap.set(speaker, (speakerMap.get(speaker) || 0) + 1);
    });
    const topSpeakers = Array.from(speakerMap.entries())
      .map(([speaker, count]) => ({ speaker, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // --- Listening pattern (time of day) ---
    const patternMap = new Map<string, number>();
    startedEvents.forEach((e) => {
      const h = new Date(e.created_at).getHours();
      const period = h >= 5 && h < 12 ? 'Morning' : h >= 12 && h < 17 ? 'Afternoon' : h >= 17 && h < 22 ? 'Evening' : 'Night';
      patternMap.set(period, (patternMap.get(period) || 0) + 1);
    });
    const totalPattern = Array.from(patternMap.values()).reduce((a, b) => a + b, 0);
    const listeningPattern = (['Morning', 'Afternoon', 'Evening', 'Night'] as const)
      .map((period) => ({
        period, count: patternMap.get(period) || 0,
        percentage: totalPattern > 0 ? Math.round(((patternMap.get(period) || 0) / totalPattern) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // --- Favorite day of week ---
    const dayOfWeekMap = new Map<string, number>();
    startedEvents.forEach((e) => {
      const dayName = dayLabels[new Date(e.created_at).getDay()];
      dayOfWeekMap.set(dayName, (dayOfWeekMap.get(dayName) || 0) + 1);
    });
    const favoriteDay = Array.from(dayOfWeekMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // --- Continue listening ---
    const continueListening = (continueRes.data || []).map((r: any) => {
      const ep = r.episodes;
      const pod = ep?.podcasts;
      const progress = r.duration_seconds
        ? Math.min(100, Math.round((r.position_seconds / r.duration_seconds) * 100))
        : ep?.duration_seconds ? Math.min(100, Math.round((r.position_seconds / ep.duration_seconds) * 100)) : 0;
      return {
        episode_id: r.episode_id, podcast_id: r.podcast_id,
        title_en: ep?.title_en ?? null, title_rw: ep?.title_rw ?? null,
        cover_image_url: ep?.cover_image_url ?? pod?.cover_image_url ?? null,
        podcast_title_en: pod?.title_en ?? null, podcast_title_rw: pod?.title_rw ?? null,
        position_seconds: r.position_seconds,
        duration_seconds: r.duration_seconds || ep?.duration_seconds || null,
        progress_percent: progress,
      };
    });

    // --- Recently completed ---
    const recentlyCompleted = (historyRes.data || [])
      .filter((r: any) => r.completed)
      .slice(0, 5)
      .map((r: any) => ({
        episode_id: r.episode_id,
        title_en: r.episodes?.title_en ?? null, title_rw: r.episodes?.title_rw ?? null,
        cover_image_url: r.episodes?.cover_image_url ?? null,
        podcast_title_en: r.episodes?.podcasts?.title_en ?? null,
        podcast_title_rw: r.episodes?.podcasts?.title_rw ?? null,
        completed_at: r.last_listened_at,
      }));

    // --- Generate insights (structured for client-side localization) ---
    const insights: { type: string; params?: Record<string, any> }[] = [];
    if (lastWeekSeconds > 0 && thisWeekSeconds > 0) {
      const pct = Math.round(((thisWeekSeconds - lastWeekSeconds) / lastWeekSeconds) * 100);
      if (pct > 0) insights.push({ type: 'weekly_growth', params: { percentage: pct } });
      else if (pct < 0) insights.push({ type: 'weekly_decline', params: { percentage: Math.abs(pct) } });
    } else if (thisWeekSeconds > 0 && lastWeekSeconds === 0) {
      insights.push({ type: 'welcome_back' });
    }
    const thisMonthCompleted = (completedRowsRes.data || []).filter((r: any) => new Date(r.last_listened_at) >= monthStart).length;
    const lastMonthCompleted = (completedRowsRes.data || []).filter((r: any) => { const d = new Date(r.last_listened_at); return d >= lastMonthStart && d < monthStart; }).length;
    if (lastMonthCompleted > 0) {
      const diff = thisMonthCompleted - lastMonthCompleted;
      if (diff > 0) insights.push({ type: 'monthly_completion_up', params: { count: diff } });
      else if (diff < 0) insights.push({ type: 'monthly_completion_down', params: { count: Math.abs(diff) } });
    } else if (thisMonthCompleted > 0) {
      insights.push({ type: 'monthly_completion_first', params: { count: thisMonthCompleted } });
    }
    if (currentStreak > 0 && longestStreak > currentStreak) {
      const gap = longestStreak - currentStreak;
      insights.push({ type: 'streak_gap', params: { gap, best: longestStreak } });
    } else if (currentStreak > 0 && currentStreak === longestStreak) {
      insights.push({ type: 'streak_matching', params: { current: currentStreak } });
    }
    const topPattern = listeningPattern[0];
    if (topPattern && topPattern.count > 0 && favoriteDay) {
      const isWeekend = favoriteDay === 'Sat' || favoriteDay === 'Sun';
      insights.push({ type: 'listening_pattern', params: { period: topPattern.period.toLowerCase(), when: isWeekend ? 'weekends' : 'weekdays' } });
    }
    if (totalProgress >= 5 && completionRate < 40) {
      insights.push({ type: 'completion_low', params: { started: totalProgress, completed: episodesCompleted } });
    }

    const episodesStarted = episodesStartedRes.count || 0;

    return NextResponse.json({
      episodesCompleted, totalProgress, completionRate, activityByDay, monthlySummary, history,
      currentStreak, longestStreak, minutesToday, minutesThisWeek, minutesThisMonth, minutesLifetime,
      episodesStarted, weeklyActivity, topPodcasts, topCategories, topSpeakers,
      listeningPattern, favoriteDay, continueListening, recentlyCompleted, insights,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
