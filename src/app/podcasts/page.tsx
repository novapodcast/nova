"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { fetchAllPublicPodcasts } from '@/lib/data/podcasts';
import { useLanguage } from '@/contexts/LanguageContext';

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

export default function PodcastsPage() {
  const { language } = useLanguage();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data, error } = await fetchAllPublicPodcasts();
      if (!error && data) {
        setPodcasts(data as unknown as Podcast[]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const visiblePodcasts = podcasts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title_en?.toLowerCase().includes(q) ||
      p.title_rw?.toLowerCase().includes(q) ||
      p.speaker_name?.toLowerCase().includes(q)
    );
  });

  const formatCount = (value: number | null | undefined) => {
    if (!value) return '0';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return new Intl.NumberFormat(language === 'rw' ? 'en-GB' : 'en-US').format(value);
  };

  const formatEpisodeCount = (count: number | null | undefined) => {
    const n = count ?? 0;
    if (language === 'rw') {
      return n === 1 ? '1 igice' : `${n} ibice`;
    }
    return n === 1 ? '1 Episode' : `${n} Episodes`;
  };

  return (
    <div className="container py-12 md:py-16 animate-fade-in-up">
      {/* Header */}
      <div className="max-w-2xl mb-10">
        <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-tight">
          {language === 'rw' ? 'Podikasti' : 'Podcasts'}
        </h1>
        <p className="text-lg text-muted">
          {language === 'rw'
            ? 'Shakisha amapodikasi yacu, uhitemo uyumve.'
            : 'Discover inspiring content from our collection of shows.'}
        </p>
      </div>

      {/* Search */}
      <div className="mb-10">
        <div className="relative max-w-md">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder={language === 'rw' ? 'Shakisha podikasti...' : 'Search podcasts...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
          />
        </div>
      </div>

      {/* Loading skeleton - square cards */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 md:gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="group">
              <div className="aspect-square rounded-xl bg-white/5 animate-pulse mb-3" />
              <div className="space-y-2">
                <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && podcasts.length === 0 && (
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
            <span className="text-5xl">🎙️</span>
          </div>
          <h2 className="text-2xl font-semibold mb-3">
            {language === 'rw' ? 'Nta podikasti ziboneka' : 'No podcasts yet'}
          </h2>
          <p className="text-muted max-w-md mx-auto">
            {language === 'rw' ? 'Dusubireho vuba tugeze amapodikasti mashya!' : 'Check back soon for new content!'}
          </p>
        </div>
      )}

      {/* No search results */}
      {!loading && podcasts.length > 0 && visiblePodcasts.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted">
            {language === 'rw' ? 'Nta bisubizo biboneka.' : 'No podcasts match your search.'}
          </p>
        </div>
      )}

      {/* Podcast grid - marketplace style with square artwork */}
      {!loading && visiblePodcasts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 md:gap-6">
          {visiblePodcasts.map((podcast) => {
            const title = (language === 'rw' ? podcast.title_rw : podcast.title_en) || podcast.title_en || podcast.title_rw || 'Untitled';

            return (
              <Link
                key={podcast.id}
                href={`/podcasts/${podcast.id}`}
                className="group block"
              >
                {/* Square artwork container */}
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
                  {/* Subtle gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Play indicator on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                      <svg className="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Metadata below artwork */}
                <div className="mt-3 space-y-1">
                  <h3 className="font-semibold text-white line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                    {title}
                  </h3>
                  {podcast.speaker_name && (
                    <p className="text-sm text-muted line-clamp-1">
                      {podcast.speaker_name}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted pt-1">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      {formatEpisodeCount(podcast.total_episodes)}
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
      )}
    </div>
  );
}
