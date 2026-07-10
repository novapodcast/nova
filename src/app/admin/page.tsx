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
        <div className="text-muted">Checking access…</div>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-16">
      <h1 className="text-3xl font-bold mb-2">{t('admin.title', language)}</h1>
      <p className="text-muted mb-8">{t('admin.subtitle', language)}</p>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link href="/admin/pricing" className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 hover:ring-primary/50 transition">
          <div className="text-sm text-muted mb-2">{t('admin.pricing', language)}</div>
          <div className="text-xl font-semibold mb-2">{t('admin.managePlans', language)}</div>
          <p className="text-sm text-muted">{t('admin.updatePricing', language)}</p>
        </Link>
        
        <Link href="/admin/analytics" className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 hover:ring-primary/50 transition">
          <div className="text-sm text-muted mb-2">{t('admin.analytics', language)}</div>
          <div className="text-xl font-semibold mb-2">Analytics Dashboard</div>
          <p className="text-sm text-muted">{t('admin.viewMetrics', language)}</p>
        </Link>
        
        <Link href="/admin/podcasts" className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 hover:ring-primary/50 transition">
          <div className="text-sm text-muted mb-2">Podcasts</div>
          <div className="text-xl font-semibold mb-2">Manage Podcasts</div>
          <p className="text-sm text-muted">Create shows, set speakers and categories</p>
        </Link>

        <Link href="/admin/content" className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 hover:ring-primary/50 transition">
          <div className="text-sm text-muted mb-2">{t('admin.content', language)}</div>
          <div className="text-xl font-semibold mb-2">Content Management</div>
          <p className="text-sm text-muted">{t('admin.manageEpisodes', language)}</p>
        </Link>

        <Link href="/admin/categories" className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 hover:ring-primary/50 transition">
          <div className="text-sm text-muted mb-2">Categories</div>
          <div className="text-xl font-semibold mb-2">Manage Categories</div>
          <p className="text-sm text-muted">Bilingual names, colors, and order</p>
        </Link>

        <Link href="/admin/carousel" className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 hover:ring-primary/50 transition">
          <div className="text-sm text-muted mb-2">Hero Carousel</div>
          <div className="text-xl font-semibold mb-2">Manage Slides</div>
          <p className="text-sm text-muted">EN/RW titles, CTAs, and scheduling</p>
        </Link>

        <Link href="/admin/users" className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 hover:ring-primary/50 transition">
          <div className="text-sm text-muted mb-2">Users</div>
          <div className="text-xl font-semibold mb-2">User Management</div>
          <p className="text-sm text-muted">Manage users and permissions</p>
        </Link>
      </div>
    </div>
  );
}
