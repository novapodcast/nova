"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
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
  is_system: boolean | null;
}

interface Episode {
  id: string;
  title_en: string | null;
  title_rw: string | null;
  description_en: string | null;
  description_rw: string | null;
  cover_image_url: string | null;
  audio_url: string | null;
  duration_seconds: number | null;
  published_at: string | null;
  episode_number: number | null;
  categories: string[] | null;
}

export default function PodcastDetailPage({ params }: { params: { id: string } }) {
  const { language } = useLanguage();
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: pod, error: podError } = await supabase
        .from('podcasts')
        .select('id, title_en, title_rw, description_en, description_rw, cover_image_url, speaker_name, total_episodes, total_listeners, is_system')
        .eq('id', params.id)
        .single();

      if (podError || !pod || pod.is_system) {
        setError(true);
        setLoading(false);
        return;
      }
      setPodcast(pod as Podcast);

      const { data: eps } = await supabase
        .from('episodes')
        .select('id, title_en, title_rw, description_en, description_rw, cover_image_url, audio_url, duration_seconds, published_at, episode_number, categories')
        .eq('podcast_id', params.id)
        .eq('is_active', true)
        .order('published_at', { ascending: false });

      if (eps) setEpisodes(eps as Episode[]);
      setLoading(false);
    };
    load();
  }, [params.id]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCount = (value: number | null | undefined) => {
    if (!value) return '0';
    return new Intl.NumberFormat(language === 'rw' ? 'en-GB' : 'en-US').format(value);
  };

  if (loading) {
    return (
      <div className="container py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 w-48 bg-white/5 rounded mb-4 animate-pulse" />
          <div className="grid md:grid-cols-[300px_1fr] gap-8">
            <div className="aspect-square rounded-xl bg-white/5 animate-pulse" />
            <div className="space-y-4">
              <div className="h-6 w-3/4 bg-white/5 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse" />
              <div className="h-20 w-full bg-white/5 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !podcast) {
    return (
      <div className="container py-12 md:py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Podcast not found</h1>
          <Link href="/podcasts" className="inline-block px-6 py-2.5 rounded-lg bg-primary text-black font-semibold hover:opacity-90 transition">
            Back to Podcasts
          </Link>
        </div>
      </div>
    );
  }

  const title = (language === 'rw' ? podcast.title_rw : podcast.title_en) || podcast.title_en || podcast.title_rw || 'Untitled';
  const description = (language === 'rw' ? podcast.description_rw : podcast.description_en) || '';

  return (
    <div className="container py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <Link href="/podcasts" className="inline-flex items-center text-sm text-muted hover:text-white mb-6 transition">
          ← {language === 'rw' ? 'Subira ku Podikasti' : 'Back to Podcasts'}
        </Link>

        <div className="grid md:grid-cols-[300px_1fr] gap-8 mb-10">
          <div className="relative aspect-square rounded-xl bg-black/40 overflow-hidden ring-1 ring-white/5">
            {podcast.cover_image_url ? (
              <Image
                src={podcast.cover_image_url}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 300px"
                className="object-cover"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted">Cover coming soon</div>
            )}
          </div>

          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">{title}</h1>
            {podcast.speaker_name && (
              <div className="text-sm text-primary font-semibold mb-2">{podcast.speaker_name}</div>
            )}
            <div className="flex items-center gap-4 text-sm text-muted mb-4">
              <span>{formatCount(podcast.total_episodes)} {language === 'rw' ? 'ibice' : 'episodes'}</span>
              <span>•</span>
              <span>{formatCount(podcast.total_listeners)} {language === 'rw' ? 'abumva' : 'listeners'}</span>
            </div>
            {description && (
              <p className="text-muted whitespace-pre-wrap">{description}</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">
            {language === 'rw' ? 'Ibice' : 'Episodes'}
          </h2>

          {episodes.length === 0 && (
            <div className="text-center py-12 bg-[var(--surface)] rounded-xl ring-1 ring-white/5">
              <div className="text-4xl mb-3">🎙️</div>
              <p className="text-muted">
                {language === 'rw' ? 'Nta bice biboneka kuri iyi podikasti.' : 'No episodes available for this podcast yet.'}
              </p>
            </div>
          )}

          {episodes.length > 0 && (
            <div className="space-y-3">
              {episodes.map((ep, idx) => {
                const epTitle = (language === 'rw' ? ep.title_rw : ep.title_en) || ep.title_en || ep.title_rw || 'Untitled';
                const epDesc = (language === 'rw' ? ep.description_rw : ep.description_en) || '';

                return (
                  <Link
                    key={ep.id}
                    href={`/episodes/${ep.id}`}
                    className="flex gap-4 bg-[var(--surface)] rounded-xl p-4 ring-1 ring-white/5 hover:ring-white/20 transition"
                  >
                    <div className="relative w-20 h-20 rounded-lg bg-black/40 overflow-hidden flex-shrink-0">
                      {ep.cover_image_url ? (
                        <Image
                          src={ep.cover_image_url}
                          alt={epTitle}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : podcast.cover_image_url ? (
                        <Image
                          src={podcast.cover_image_url}
                          alt={epTitle}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {ep.episode_number != null && (
                          <span className="text-xs text-muted">#{ep.episode_number}</span>
                        )}
                      </div>
                      <h3 className="font-semibold line-clamp-1">{epTitle}</h3>
                      {epDesc && <p className="text-sm text-muted line-clamp-2 mt-1">{epDesc}</p>}
                      <div className="flex items-center gap-3 text-xs text-muted mt-2">
                        {ep.duration_seconds != null && <span>{formatDuration(ep.duration_seconds)}</span>}
                        {ep.published_at && <span>•</span>}
                        {ep.published_at && <span>{new Date(ep.published_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
