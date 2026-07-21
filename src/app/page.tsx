'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../lib/i18n';
import NewsletterSignup from '../components/NewsletterSignup';
import HeroCarousel, { CarouselSlide } from '../components/HeroCarousel';
import { fetchFeaturedPublicPodcasts } from '@/lib/data/podcasts';
import { supabase } from '@/lib/supabaseClient';

interface Podcast {
  id: string;
  title_en: string | null;
  title_rw: string | null;
  description_en: string | null;
  description_rw: string | null;
  cover_image_url: string | null;
  speaker_name: string | null;
  total_episodes: number | null;
  total_listeners: number | null;
}

interface ContinueListeningItem {
  episode_id: string;
  position_seconds: number;
  duration_seconds: number | null;
  completed: boolean;
  episodes: {
    id: string;
    title_en: string | null;
    title_rw: string | null;
    cover_image_url: string | null;
    podcasts: {
      id: string;
      title_en: string | null;
      title_rw: string | null;
      cover_image_url: string | null;
    } | null;
  } | null;
}

export default function HomePage() {
  const { language } = useLanguage();
  const [featuredPodcasts, setFeaturedPodcasts] = useState<Podcast[]>([]);
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [continueItems, setContinueItems] = useState<ContinueListeningItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function loadFeatured() {
      const { data } = await fetchFeaturedPublicPodcasts(8);
      if (data) setFeaturedPodcasts(data as unknown as Podcast[]);
    }
    async function loadSlides() {
      const { data } = await supabase
        .from('carousel_slides')
        .select('title_en, title_rw, subtitle_en, subtitle_rw, description_en, description_rw, cta_label_en, cta_label_rw, cta_url, background_image_url, background_color')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (data) setSlides(data as CarouselSlide[]);
    }
    loadFeatured();
    loadSlides();
    loadContinueListening();
  }, []);

  async function loadContinueListening() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      setIsLoggedIn(true);
      const res = await fetch('/api/progress?type=continue', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setContinueItems(data.items || []);
      }
    } catch {}
  }

  const formatCount = (value: number | null | undefined) => {
    if (!value) return '0';
    return new Intl.NumberFormat(language === 'rw' ? 'en-GB' : 'en-US').format(value);
  };

  return (
    <div>
      {/* Hero Carousel */}
      <HeroCarousel language={language} slides={slides} />

      {/* Continue Listening (for logged-in users) */}
      {isLoggedIn && continueItems.length > 0 && (
        <section className="container py-8 md:py-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold mb-1">
                {language === 'rw' ? 'Komeza Kumva' : 'Continue Listening'}
              </h2>
              <p className="text-sm text-muted">
                {language === 'rw' ? 'Komeza aho wasize' : 'Pick up where you left off'}
              </p>
            </div>
            <Link href="/library" className="text-sm text-primary hover:underline font-medium">
              {language === 'rw' ? 'Reba byose' : 'View all'} →
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
            {continueItems.slice(0, 6).map((item) => {
              if (!item.episodes) return null;
              const ep = item.episodes;
              const pod = ep.podcasts;
              const epTitle = (language === 'rw' ? ep.title_rw : ep.title_en) || ep.title_en || 'Untitled';
              const podTitle = pod ? ((language === 'rw' ? pod.title_rw : pod.title_en) || pod.title_en) : '';
              const cover = ep.cover_image_url || pod?.cover_image_url;
              const progressPercent = item.duration_seconds
                ? Math.min(100, (item.position_seconds / item.duration_seconds) * 100)
                : 0;

              return (
                <Link
                  key={item.episode_id}
                  href={`/episodes/${ep.id}`}
                  className="flex-shrink-0 w-64 snap-start group"
                >
                  <div className="relative h-40 rounded-xl overflow-hidden bg-black/40 ring-1 ring-white/10 group-hover:ring-primary/40 transition">
                    {cover && (
                      <Image src={cover} alt="" fill sizes="256px" className="object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="h-1 bg-white/20 rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${progressPercent}%` }} />
                      </div>
                      <p className="text-sm font-medium text-white truncate">{epTitle}</p>
                      <p className="text-xs text-muted truncate">{podTitle}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured Podcasts */}
      <section className="container py-12 md:py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-1">
              {language === 'rw' ? 'Podikasti zigaragara' : 'Featured Podcasts'}
            </h2>
            <p className="text-sm text-muted">
              {language === 'rw'
                ? 'Hitamo inkuru zicukumbuye, ziganjemo ababiteraniye.'
                : 'Explore curated shows designed to uplift, inspire, and grow with you.'}
            </p>
          </div>
          <Link href="/podcasts" className="text-sm text-primary hover:underline font-medium">
            {language === 'rw' ? 'Reba podcasts zose' : 'Browse all podcasts'} →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 md:gap-6">
          {featuredPodcasts.map((podcast) => {
            const title = (language === 'rw' ? podcast.title_rw : podcast.title_en) || podcast.title_en || podcast.title_rw || 'Untitled';
            return (
              <Link key={podcast.id} href={`/podcasts/${podcast.id}`} className="group block">
                {/* Square artwork to match logged-in/library sizing */}
                <div className="relative aspect-square rounded-xl bg-black/40 overflow-hidden ring-1 ring-white/5 group-hover:ring-primary/50 transition-all duration-300 group-hover:shadow-[0_8px_30px_rgba(34,197,94,0.15)]">
                  {podcast.cover_image_url ? (
                    <Image
                      src={podcast.cover_image_url}
                      alt={title}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <span className="text-4xl opacity-50">🎙️</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                {/* Meta */}
                <div className="mt-3 space-y-1">
                  <h3 className="font-semibold text-white line-clamp-2 leading-snug group-hover:text-primary transition-colors">{title}</h3>
                  {podcast.speaker_name && (
                    <p className="text-sm text-muted/90 line-clamp-1">{podcast.speaker_name}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted pt-1">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      {(podcast.total_episodes ?? 0) === 1 ? '1 Episode' : `${podcast.total_episodes ?? 0} Episodes`}
                    </span>
                    {(podcast.total_listeners ?? 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {formatCount(podcast.total_listeners)}
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
