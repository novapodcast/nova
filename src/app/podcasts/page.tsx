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
    return new Intl.NumberFormat(language === 'rw' ? 'en-GB' : 'en-US').format(value);
  };

  return (
    <div className="container py-12 md:py-16 animate-fade-in-up">
      <h1 className="text-3xl font-bold mb-2">
        {language === 'rw' ? 'Podikasti zose' : 'All Podcasts'}
      </h1>
      <p className="text-sm text-muted mb-6">
        {language === 'rw'
          ? 'Shakisha amapodikasi yacu, uhitemo uyumve.'
          : 'Browse our collection of podcasts and start listening.'}
      </p>

      <div className="mb-6">
        <input
          type="text"
          placeholder={language === 'rw' ? '🔍 Shakisha podikasti...' : '🔍 Search podcasts...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
        />
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[var(--surface)] rounded-2xl overflow-hidden ring-1 ring-white/5">
              <div className="h-48 bg-white/5 animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-5 w-3/4 bg-white/5 rounded animate-pulse" />
                <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && podcasts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎙️</div>
          <h2 className="text-xl font-semibold mb-2">
            {language === 'rw' ? 'Nta podikasti ziboneka' : 'No podcasts yet'}
          </h2>
          <p className="text-muted">
            {language === 'rw' ? 'Dusubireho vuba tugeze amapodikasi mashya!' : 'Check back soon for new content!'}
          </p>
        </div>
      )}

      {!loading && visiblePodcasts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {visiblePodcasts.map((podcast) => {
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
      )}
    </div>
  );
}
