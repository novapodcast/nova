'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../lib/i18n';
import NewsletterSignup from '../components/NewsletterSignup';
import HeroCarousel from '../components/HeroCarousel';
import { supabase } from '@/lib/supabaseClient';

interface Episode {
  id: string;
  title_en: string | null;
  title_rw: string | null;
  cover_image_url: string | null;
  duration_seconds: number | null;
  categories?: string[] | null;
}

export default function HomePage() {
  const { language } = useLanguage();
  const [featuredEpisodes, setFeaturedEpisodes] = useState<Episode[]>([]);

  useEffect(() => {
    async function loadFeatured() {
      const { data } = await supabase
        .from('episodes')
        .select('id, title_en, title_rw, cover_image_url, duration_seconds, categories')
        .eq('is_active', true)
        .order('published_at', { ascending: false })
        .limit(8);
      
      if (data) setFeaturedEpisodes(data);
    }
    loadFeatured();
  }, []);

  const getCategoryColor = (categories?: string[] | null) => {
    if (!categories || categories.length === 0) return '#22c55e';
    const colorMap: Record<string, string> = {
      'IJURU': '#3b82f6',
      'URUGO': '#8b5cf6',
      'KWIMENYA': '#ec4899',
      'UBUMANA': '#f59e0b',
      'KURERA': '#10b981',
      'URUKUNDO': '#ef4444',
      'UBUKIRE': '#84cc16',
    };
    return colorMap[categories[0]] || '#22c55e';
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      {/* Hero Carousel */}
      <HeroCarousel language={language} />

      {/* Featured Episodes - NFT Style Grid */}
      <section className="container py-12 md:py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-1">{t('home.featuredEpisodes', language)}</h2>
            <p className="text-sm text-muted">{t('home.episodesAvailable', language)}</p>
          </div>
          <Link href="/episodes" className="text-sm text-primary hover:underline font-medium">
            {t('home.viewAll', language)} →
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {featuredEpisodes.map((episode) => {
            const catColor = getCategoryColor(episode.categories);
            const title = (language === 'rw' ? episode.title_rw : episode.title_en) || episode.title_en || episode.title_rw || 'Untitled';
            
            return (
              <Link
                key={episode.id}
                href={`/episodes/${episode.id}`}
                className="group relative bg-[var(--surface)] rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
                style={{ '--cat-color': catColor } as any}
              >
                {/* Thumbnail */}
                <div className="relative aspect-[4/3] overflow-hidden bg-black/40">
                  {episode.cover_image_url ? (
                    <img
                      src={episode.cover_image_url}
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg width="40" height="40" viewBox="0 0 20 20" fill="none">
                        <rect x="2" y="8" width="2.5" height="4" rx="1.2" fill="currentColor" opacity="0.3" />
                        <rect x="5.5" y="5" width="2.5" height="10" rx="1.2" fill="currentColor" opacity="0.5" />
                        <rect x="9" y="3" width="2.5" height="14" rx="1.2" fill="currentColor" />
                        <rect x="12.5" y="5" width="2.5" height="10" rx="1.2" fill="currentColor" opacity="0.5" />
                        <rect x="16" y="8" width="2.5" height="4" rx="1.2" fill="currentColor" opacity="0.3" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  
                  {/* Category badge */}
                  {episode.categories && episode.categories.length > 0 && (
                    <div
                      className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm"
                      style={{
                        backgroundColor: `${catColor}20`,
                        color: catColor,
                        border: `1px solid ${catColor}40`,
                      }}
                    >
                      {episode.categories[0]}
                    </div>
                  )}

                  {/* Play button overlay */}
                  <button
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100"
                    style={{ backgroundColor: catColor, boxShadow: `0 4px 24px ${catColor}40` }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#000">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>

                {/* Card body */}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-bold line-clamp-2 flex-1 leading-snug">
                      {title}
                    </h3>
                    {episode.duration_seconds && (
                      <span className="text-[10px] text-muted font-mono whitespace-nowrap pt-0.5">
                        {formatDuration(episode.duration_seconds)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="container pb-12 md:pb-16">
        <NewsletterSignup />
      </section>

      <section className="container pb-12 md:pb-16">
        <div className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-sm text-muted">Follow Nova</div>
            <div className="text-white font-semibold">Join our community</div>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://twitter.com/novapodcast" target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition">X</a>
            <a href="https://instagram.com/novapodcast" target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition">IG</a>
            <a href="https://facebook.com/novapodcast" target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition">FB</a>
            <a href="https://youtube.com/@novapodcast" target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition">YT</a>
          </div>
        </div>
      </section>
    </div>
  );
}
