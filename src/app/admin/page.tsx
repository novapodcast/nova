"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/i18n';

export default function AdminPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const verify = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!active) return;
      const email = userData.user?.email ?? null;
      if (!email) { router.replace('/login'); return; }

      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { router.replace('/login'); return; }

      try {
        const res = await fetch('/api/admin/guard', { headers: { Authorization: `Bearer ${token}` } });
        if (!active) return;
        if (res.ok) {
          setLoading(false);
        } else {
          router.replace('/dashboard');
        }
      } catch {
        if (!active) return;
        router.replace('/dashboard');
      }
    };
    verify();
    return () => { active = false; };
  }, [router]);

  if (loading) {
    return (
      <div className="container py-12 md:py-16">
        <div className="max-w-5xl mx-auto">
          <div className="h-8 w-48 bg-white/5 rounded mb-3 animate-pulse" />
          <div className="h-4 w-64 bg-white/5 rounded mb-8 animate-pulse" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 h-32 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-16">
      <h1 className="text-3xl font-bold mb-2">{t('admin.title', language)}</h1>
      <p className="text-muted mb-8">{t('admin.subtitle', language)}</p>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link href="/admin/pricing" className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 hover:ring-primary/50 transition group">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 text-primary group-hover:bg-primary/20 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="text-sm text-muted mb-2">{t('admin.pricing', language)}</div>
          <div className="text-xl font-semibold mb-2">{t('admin.managePlans', language)}</div>
          <p className="text-sm text-muted">{t('admin.updatePricing', language)}</p>
        </Link>
        
        <Link href="/admin/analytics" className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 hover:ring-primary/50 transition group">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 text-primary group-hover:bg-primary/20 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <div className="text-sm text-muted mb-2">{t('admin.analytics', language)}</div>
          <div className="text-xl font-semibold mb-2">Analytics Dashboard</div>
          <p className="text-sm text-muted">{t('admin.viewMetrics', language)}</p>
        </Link>
        
        <Link href="/admin/podcasts" className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 hover:ring-primary/50 transition group">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 text-primary group-hover:bg-primary/20 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </div>
          <div className="text-sm text-muted mb-2">Podcasts</div>
          <div className="text-xl font-semibold mb-2">Manage Podcasts</div>
          <p className="text-sm text-muted">Create shows, set speakers and categories</p>
        </Link>

        <Link href="/admin/content" className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 hover:ring-primary/50 transition group">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 text-primary group-hover:bg-primary/20 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <div className="text-sm text-muted mb-2">{t('admin.content', language)}</div>
          <div className="text-xl font-semibold mb-2">Content Management</div>
          <p className="text-sm text-muted">{t('admin.manageEpisodes', language)}</p>
        </Link>

        <Link href="/admin/categories" className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 hover:ring-primary/50 transition group">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 text-primary group-hover:bg-primary/20 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
          </div>
          <div className="text-sm text-muted mb-2">Categories</div>
          <div className="text-xl font-semibold mb-2">Manage Categories</div>
          <p className="text-sm text-muted">Bilingual names, colors, and order</p>
        </Link>

        <Link href="/admin/carousel" className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 hover:ring-primary/50 transition group">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 text-primary group-hover:bg-primary/20 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <div className="text-sm text-muted mb-2">Hero Carousel</div>
          <div className="text-xl font-semibold mb-2">Manage Slides</div>
          <p className="text-sm text-muted">EN/RW titles, CTAs, and scheduling</p>
        </Link>

        <Link href="/admin/users" className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 hover:ring-primary/50 transition group">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 text-primary group-hover:bg-primary/20 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6-3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <div className="text-sm text-muted mb-2">Users</div>
          <div className="text-xl font-semibold mb-2">User Management</div>
          <p className="text-sm text-muted">Manage users and permissions</p>
        </Link>
      </div>
    </div>
  );
}
