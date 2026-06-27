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

export async function GET(request: NextRequest) {
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

    const clientForRead = admin ?? supabase;

    // Parse date filters (fallback to last 30 days)
    const { searchParams } = new URL(request.url);
    const endParam = searchParams.get('end');
    const startParam = searchParams.get('start');
    const endAt = endParam ? new Date(endParam) : new Date();
    const startAt = startParam ? new Date(startParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const startISO = startAt.toISOString();
    const endISO = endAt.toISOString();

    const { count: totalUsers } = await clientForRead
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: recentSignups } = await clientForRead
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo);

    const { count: activeSubscriptions } = await clientForRead
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { data: payments } = await clientForRead
      .from('payments')
      .select('amount, currency')
      .eq('status', 'succeeded');
    const totalRevenue = payments?.reduce((sum, p) => sum + (p.currency === 'RWF' ? p.amount || 0 : 0), 0) || 0;

    const { count: totalEpisodes } = await clientForRead
      .from('episodes')
      .select('*', { count: 'exact', head: true });

    const { count: premiumEpisodes } = await clientForRead
      .from('episodes')
      .select('*', { count: 'exact', head: true })
      .eq('is_premium', true);

    const { data: favoritesData } = await clientForRead
      .from('favorites')
      .select('episode_id, episodes(title)');

    const episodeFavCounts: Record<string, { title: string; count: number }> = {};
    favoritesData?.forEach((fav: any) => {
      const title = fav.episodes?.title || 'Unknown';
      if (!episodeFavCounts[fav.episode_id]) {
        episodeFavCounts[fav.episode_id] = { title, count: 0 };
      }
      episodeFavCounts[fav.episode_id].count++;
    });

    const topEpisodes = Object.values(episodeFavCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((e) => ({ title: e.title, favorites: e.count }));

    const { data: subscriptions } = await clientForRead
      .from('user_subscriptions')
      .select('plan_id, pricing_tiers(display_name_en)');

    const { data: paymentsWithPlan } = await clientForRead
      .from('payments')
      .select('amount_rwf, user_subscriptions(pricing_tiers(display_name_en))')
      .eq('status', 'completed');

    // Optional: listens aggregations (if table exists and has data)
    let listensByEpisode: Array<{ episode_id: string; title: string; listens: number }> = [];
    let listensByCategory: Array<{ category: string; listens: number }> = [];
    let dailyListens: Array<{ date: string; listens: number }> = [];
    try {
      // Count listens grouped by episode within date window
      const { data: listenRows } = await clientForRead
        .from('listens')
        .select('episode_id, created_at')
        .gte('created_at', startISO)
        .lte('created_at', endISO);

      const byEpisode = new Map<string, number>();
      const byDate = new Map<string, number>();
      for (const r of listenRows || []) {
        byEpisode.set(r.episode_id, (byEpisode.get(r.episode_id) || 0) + 1);
        const d = new Date(r.created_at).toISOString().slice(0, 10);
        byDate.set(d, (byDate.get(d) || 0) + 1);
      }

      // Fetch episode titles and categories
      const ids = Array.from(byEpisode.keys());
      if (ids.length > 0) {
        const { data: eps } = await clientForRead
          .from('episodes')
          .select('id, title_en, title_rw, categories')
          .in('id', ids);

        const catCounts = new Map<string, number>();
        for (const ep of eps || []) {
          const listens = byEpisode.get(ep.id) || 0;
          const title = ep.title_en || ep.title_rw || 'Untitled';
          listensByEpisode.push({ episode_id: ep.id, title, listens });

          const cats: string[] = (ep as any).categories || [];
          for (const c of cats) {
            catCounts.set(c, (catCounts.get(c) || 0) + listens);
          }
        }
        listensByEpisode.sort((a, b) => b.listens - a.listens);
        listensByCategory = Array.from(catCounts.entries()).map(([category, listens]) => ({ category, listens }))
          .sort((a, b) => b.listens - a.listens);
      }

      dailyListens = Array.from(byDate.entries()).map(([date, listens]) => ({ date, listens }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (e) {
      // If listens table is not present, skip silently
    }

    const revenueByPlan: Record<string, { revenue: number; count: number }> = {};
    paymentsWithPlan?.forEach((p: any) => {
      const plan = p.user_subscriptions?.pricing_tiers?.display_name_en || 'Unknown';
      if (!revenueByPlan[plan]) {
        revenueByPlan[plan] = { revenue: 0, count: 0 };
      }
      revenueByPlan[plan].revenue += p.amount_rwf || 0;
      revenueByPlan[plan].count++;
    });

    const revenueByPlanArray = Object.entries(revenueByPlan).map(([plan, data]) => ({
      plan,
      revenue: data.revenue,
      count: data.count,
    }));

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      activeSubscriptions: activeSubscriptions || 0,
      totalRevenue,
      totalEpisodes: totalEpisodes || 0,
      premiumEpisodes: premiumEpisodes || 0,
      recentSignups: recentSignups || 0,
      topEpisodes,
      revenueByPlan: revenueByPlanArray,
      listensByEpisode,
      listensByCategory,
      dailyListens,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
