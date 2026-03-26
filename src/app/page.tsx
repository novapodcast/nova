'use client';

import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../lib/i18n';

export default function HomePage() {
  const { language } = useLanguage();
  return (
    <div>
      <section className="container container-hero pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight text-white">
              {t('home.tagline', language)}
            </h1>
            <p className="mt-5 text-base md:text-lg text-muted max-w-xl">
              {t('home.subtitle', language)}
            </p>
            <div className="mt-8 flex items-center gap-4">
              <Link href="/episodes" className="px-5 py-3 rounded-full bg-[var(--primary)] text-black font-semibold hover:opacity-90">
                {t('home.startListening', language)}
              </Link>
              <Link href="/pricing" className="px-5 py-3 rounded-full border border-white/10 hover:border-white/30">
                {t('home.browsePlans', language)}
              </Link>
            </div>
            <div className="mt-6 text-sm text-muted">{t('home.episodesAvailable', language)}</div>
          </div>
          <div>
            <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/10">
              <img src="/hero-placeholder.png" alt="Podcast" className="w-full h-auto object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="container py-12 md:py-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">{t('home.featuredEpisodes', language)}</h2>
          <Link href="/episodes" className="text-sm text-muted hover:text-white">{t('home.viewAll', language)}</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {[1,2,3,4].map((i) => (
            <div key={i} className="bg-[var(--surface)] rounded-xl p-3 ring-1 ring-white/5">
              <div className="aspect-[4/3] rounded-lg bg-black/40" />
              <div className="mt-3 text-sm text-muted">{t('episodes.episode', language)}</div>
              <div className="text-white font-semibold">{t('common.comingSoon', language)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
