'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../lib/i18n';
import NewsletterSignup from '../components/NewsletterSignup';
import HeroCarousel, { CarouselSlide } from '../components/HeroCarousel';
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

export default function HomePage() {
  const { language } = useLanguage();
  const [featuredPodcasts, setFeaturedPodcasts] = useState<Podcast[]>([]);
  const [slides, setSlides] = useState<CarouselSlide[]>([]);

  useEffect(() => {
    async function loadFeatured() {
      const { data } = await supabase
        .from('podcasts')
        .select('id, title_en, title_rw, description_en, description_rw, cover_image_url, speaker_name, total_episodes, total_listeners')
        .eq('is_active', true)
        .order('total_listeners', { ascending: false })
        .limit(8);
      if (data) setFeaturedPodcasts(data);
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
  }, []);

  const formatCount = (value: number | null | undefined) => {
    if (!value) return '0';
    return new Intl.NumberFormat(language === 'rw' ? 'en-GB' : 'en-US').format(value);
  };

  return (
    <div>
      {/* Hero Carousel */}
      <HeroCarousel language={language} slides={slides} />

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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {featuredPodcasts.map((podcast) => {
            const title = (language === 'rw' ? podcast.title_rw : podcast.title_en) || podcast.title_en || podcast.title_rw || 'Untitled';
            const description = (language === 'rw' ? podcast.description_rw : podcast.description_en) || '';

            return (
              <Link
                key={podcast.id}
                href={`/podcasts/${podcast.id}`}
                className="group block bg-[var(--surface)] rounded-2xl overflow-hidden ring-1 ring-white/5 hover:ring-white/20 transition"
              >
                <div className="relative h-48 bg-black/40">
                  {podcast.cover_image_url ? (
                    <Image
                      src={podcast.cover_image_url}
                      alt={title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted">Cover coming soon</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  <div className="absolute left-4 bottom-4 text-xs uppercase tracking-wider text-white/80">
                    {podcast.speaker_name}
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold line-clamp-2">{title}</h3>
                    <div className="text-xs text-muted">{formatCount(podcast.total_episodes)} eps</div>
                  </div>
                  <p className="text-sm text-muted line-clamp-2">{description}</p>
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted">
                    <span>{language === 'rw' ? 'Abamaze kuyumva' : 'Listeners'}: {formatCount(podcast.total_listeners)}</span>
                    <span className="text-primary">View Episodes →</span>
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
