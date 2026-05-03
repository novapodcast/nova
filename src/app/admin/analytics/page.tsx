"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { isAdminEmail } from '@/lib/admin';

type AnalyticsData = {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  totalEpisodes: number;
  premiumEpisodes: number;
  recentSignups: number;
  topEpisodes: Array<{ title: string; favorites: number }>;
  revenueByPlan: Array<{ plan: string; revenue: number; count: number }>;
};

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      const email = data.user?.email ?? null;
      if (!email) {
        router.replace('/login');
        return;
      }

      const userId = data.user?.id;
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();

      const isAdmin = profile?.is_admin || isAdminEmail(email);
      if (!isAdmin) {
        router.replace('/dashboard');
        return;
      }

      fetchAnalytics();
      setLoading(false);
    });
    return () => { active = false; };
  }, [router]);

  async function fetchAnalytics() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch('/api/admin/analytics', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (e) {
      console.error('Failed to fetch analytics', e);
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
      const csvRows = [
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

  if (loading) {
    return (
      <div className="container py-12 md:py-16">
        <div className="text-muted">Loading analytics…</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container py-12 md:py-16">
        <div className="text-muted">Failed to load analytics</div>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-16">
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
          <div className="text-xs text-muted mt-2">All-time</div>
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
