"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { isAdminEmail } from '@/lib/admin';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/i18n';

export default function AdminPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const email = data.user?.email ?? null;
      if (!email) {
        router.replace('/login');
        return;
      }
      if (!isAdminEmail(email)) {
        router.replace('/dashboard');
        return;
      }
      setLoading(false);
    });
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

      <div className="grid md:grid-cols-3 gap-5">
        <Link href="/admin/pricing" className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 hover:ring-primary/50 transition">
          <div className="text-sm text-muted mb-2">{t('admin.pricing', language)}</div>
          <div className="text-xl font-semibold mb-2">{t('admin.managePlans', language)}</div>
          <p className="text-sm text-muted">{t('admin.updatePricing', language)}</p>
        </Link>
        
        <div className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 opacity-50">
          <div className="text-sm text-muted mb-2">{t('admin.analytics', language)}</div>
          <div className="text-xl font-semibold mb-2">{t('admin.comingSoon', language)}</div>
          <p className="text-sm text-muted">{t('admin.viewMetrics', language)}</p>
        </div>
        
        <div className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 opacity-50">
          <div className="text-sm text-muted mb-2">{t('admin.content', language)}</div>
          <div className="text-xl font-semibold mb-2">{t('admin.comingSoon', language)}</div>
          <p className="text-sm text-muted">{t('admin.manageEpisodes', language)}</p>
        </div>
      </div>
    </div>
  );
}
