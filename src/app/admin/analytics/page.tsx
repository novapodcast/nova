"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAdminGuard } from '@/lib/useAdminGuard';

type AnalyticsData = {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  totalEpisodes: number;
  premiumEpisodes: number;
  recentSignups: number;
  topEpisodes: Array<{ title: string; favorites: number }>;
  revenueByPlan: Array<{ plan: string; revenue: number; count: number }>;
  listensByEpisode?: Array<{ episode_id: string; title: string; listens: number }>;
  listensByCategory?: Array<{ category: string; listens: number }>;
  dailyListens?: Array<{ date: string; listens: number }>;
};

export default function AdminAnalyticsPage() {
  const { loading: guardLoading, authorized } = useAdminGuard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');

  useEffect(() => {
    if (authorized) {
      fetchAnalytics();
    }
  }, [authorized]);

  async function fetchAnalytics() {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (start) params.set('start', new Date(start).toISOString());
      if (end) params.set('end', new Date(end).toISOString());

      const res = await fetch(`/api/admin/analytics${params.toString() ? `?${params}` : ''}` , {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
        setError(null);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        setError(errorData.error || `Failed to load analytics (${res.status})`);
      }
    } catch (e: any) {
      console.error('Failed to fetch analytics', e);
      setError(e?.message || 'Network error - please check your connection');
    } finally {
      setLoading(false);
    }
  }

  async function exportData(format: 'csv' | 'json') {
    if (!analytics) return;

    const data = {
      summary: {
        totalUsers: analytics.totalUsers,
        activeSubscriptions: analytics.activeSubscriptions,
        totalRevenue: analytics.totalRevenue,
        totalEpisodes: analytics.totalEpisodes,
        premiumEpisodes: analytics.premiumEpisodes,
        recentSignups: analytics.recentSignups,
      },
      topEpisodes: analytics.topEpisodes,
      revenueByPlan: analytics.revenueByPlan,
      dailyListens: analytics.dailyListens ?? [],
      listensByEpisode: analytics.listensByEpisode ?? [],
      listensByCategory: analytics.listensByCategory ?? [],
      exportedAt: new Date().toISOString(),
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nova-analytics-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const csvRows: (string | number)[][] = [
        ['Metric', 'Value'],
        ['Total Users', analytics.totalUsers],
        ['Active Subscriptions', analytics.activeSubscriptions],
        ['Total Revenue (RWF)', analytics.totalRevenue],
        ['Total Episodes', analytics.totalEpisodes],
        ['Premium Episodes', analytics.premiumEpisodes],
        ['Recent Signups (7 days)', analytics.recentSignups],
        [''],
        ['Top Episodes'],
        ['Title', 'Favorites'],
        ...analytics.topEpisodes.map((ep) => [ep.title, ep.favorites]),
        [''],
        ['Revenue by Plan'],
        ['Plan', 'Revenue (RWF)', 'Subscribers'],
        ...analytics.revenueByPlan.map((p) => [p.plan, p.revenue, p.count]),
      ];

      if (analytics.dailyListens && analytics.dailyListens.length > 0) {
        csvRows.push([''], ['Daily Listens'], ['Date', 'Listens']);
        analytics.dailyListens.forEach((d) => csvRows.push([d.date, d.listens]));
      }
      if (analytics.listensByEpisode && analytics.listensByEpisode.length > 0) {
        csvRows.push([''], ['Listens by Episode'], ['Title', 'Listens']);
        analytics.listensByEpisode.forEach((e) => csvRows.push([e.title, e.listens]));
      }
      if (analytics.listensByCategory && analytics.listensByCategory.length > 0) {
        csvRows.push([''], ['Listens by Category'], ['Category', 'Listens']);
        analytics.listensByCategory.forEach((c) => csvRows.push([c.category, c.listens]));
      }

      const csv = csvRows.map((row) => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nova-analytics-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  if (guardLoading || !authorized) {
    return (
      <div className="container py-12 md:py-16">
        <div className="text-muted">{guardLoading ? 'Checking access…' : 'Unauthorized'}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container py-12 md:py-16">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="text-muted">Loading analytics…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-12 md:py-16">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-400 mb-2">Failed to load analytics</h3>
          <p className="text-sm text-red-300 mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container py-12 md:py-16">
        <div className="text-muted">No analytics data available</div>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-16">
      {/* Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-end gap-3 mb-6">
        <div>
          <label className="block text-xs text-muted mb-1">Start</label>
          <input type="date" value={start} onChange={(e)=>setStart(e.target.value)} className="px-3 py-2 rounded bg-white/5 border border-white/10" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">End</label>
          <input type="date" value={end} onChange={(e)=>setEnd(e.target.value)} className="px-3 py-2 rounded bg-white/5 border border-white/10" />
        </div>
        <button onClick={fetchAnalytics} className="px-4 py-2 bg-primary text-black rounded-lg mt-4 md:mt-0">Apply</button>
      </div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-muted">Track user engagement, revenue, and content performance</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportData('csv')}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition text-sm"
          >
            📊 Export CSV
          </button>
          <button
            onClick={() => exportData('json')}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition text-sm"
          >
            📄 Export JSON
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mb-8">
        <div className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5">
          <div className="text-sm text-muted mb-1">Total Users</div>
          <div className="text-3xl font-bold">{analytics.totalUsers.toLocaleString()}</div>
          <div className="text-xs text-muted mt-2">+{analytics.recentSignups} this week</div>
        </div>

        <div className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5">
          <div className="text-sm text-muted mb-1">Active Subscriptions</div>
          <div className="text-3xl font-bold">{analytics.activeSubscriptions.toLocaleString()}</div>
          <div className="text-xs text-green-500 mt-2">Paying customers</div>
        </div>

        <div className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5">
          <div className="text-sm text-muted mb-1">Total Revenue</div>
          <div className="text-3xl font-bold">{analytics.totalRevenue.toLocaleString()} RWF</div>
          <div className="text-xs text-muted mt-2">{start || end ? 'Selected range' : 'Last 30 days'}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-8">
        <div className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5">
          <h2 className="text-xl font-semibold mb-4">Content Stats</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted">Total Episodes</span>
              <span className="font-semibold">{analytics.totalEpisodes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Premium Episodes</span>
              <span className="font-semibold">{analytics.premiumEpisodes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Free Episodes</span>
              <span className="font-semibold">{analytics.totalEpisodes - analytics.premiumEpisodes}</span>
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5">
          <h2 className="text-xl font-semibold mb-4">Revenue by Plan</h2>
          <div className="space-y-3">
            {analytics.revenueByPlan.map((item) => (
              <div key={item.plan} className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{item.plan}</div>
                  <div className="text-xs text-muted">{item.count} subscribers</div>
                </div>
                <div className="font-semibold">{item.revenue.toLocaleString()} RWF</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Listens over time */}
      {analytics.dailyListens && analytics.dailyListens.length > 0 && (
        <div className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 mb-8">
          <h2 className="text-xl font-semibold mb-4">Daily Listens</h2>
          <div className="space-y-2">
            {analytics.dailyListens.map((d) => {
              const max = Math.max(...analytics.dailyListens!.map(x => x.listens));
              const pct = max > 0 ? Math.round((d.listens / max) * 100) : 0;
              return (
                <div key={d.date} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-muted">{d.date}</div>
                  <div className="flex-1 h-2 bg-white/10 rounded">
                    <div className="h-2 bg-primary rounded" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="w-10 text-right text-xs">{d.listens}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top listened episodes */}
      {analytics.listensByEpisode && analytics.listensByEpisode.length > 0 && (
        <div className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 mb-8">
          <h2 className="text-xl font-semibold mb-4">Top Listened Episodes</h2>
          <div className="space-y-3">
            {analytics.listensByEpisode.slice(0, 10).map((ep, idx) => (
              <div key={ep.episode_id} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">{idx + 1}</div>
                  <span className="font-medium">{ep.title}</span>
                </div>
                <span className="text-muted">▶️ {ep.listens} listens</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Listens by category */}
      {analytics.listensByCategory && analytics.listensByCategory.length > 0 && (
        <div className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 mb-8">
          <h2 className="text-xl font-semibold mb-4">Listens by Category</h2>
          <div className="space-y-3">
            {analytics.listensByCategory.map((item) => (
              <div key={item.category} className="flex justify-between items-center">
                <div className="font-medium">{item.category}</div>
                <div className="text-muted">{item.listens.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5">
        <h2 className="text-xl font-semibold mb-4">Top Episodes</h2>
        <div className="space-y-3">
          {analytics.topEpisodes.map((ep, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                  {idx + 1}
                </div>
                <span className="font-medium">{ep.title}</span>
              </div>
              <span className="text-muted">❤️ {ep.favorites} favorites</span>
            </div>
          ))}
        </div>
        {analytics.topEpisodes.length === 0 && (
          <div className="text-center text-muted py-8">No episode data yet</div>
        )}
      </div>
    </div>
  );
}
