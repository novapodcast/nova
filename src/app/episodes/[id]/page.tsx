"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getCache, setCache } from '@/lib/cache';
import { useLanguage } from '../../../contexts/LanguageContext';
import { t } from '../../../lib/i18n';

interface Props { params: { id: string } }

interface Episode {
  id: string;
  title_en: string | null;
  title_rw: string | null;
  description_en: string | null;
  description_rw: string | null;
  cover_image_url: string | null;
  duration_seconds: number | null;
  published_at: string | null;
  podcast_id: string | null;
  categories?: string[] | null;
  podcasts?: {
    title_en: string | null;
    title_rw: string | null;
  };
}

export default function EpisodeDetailPage({ params }: Props) {
  const { language } = useLanguage();
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const cacheKey = `episode_${params.id}_v1`;
    const cached = getCache<Episode>(cacheKey);
    if (cached) {
      setEpisode(cached);
      setLoading(false);
    }

    const load = async () => {
      const { data, error: fetchError } = await supabase
        .from('episodes')
        .select(`
          id,
          title_en,
          title_rw,
          description_en,
          description_rw,
          cover_image_url,
          duration_seconds,
          published_at,
          podcast_id,
          categories,
          podcasts!inner(title_en, title_rw)
        `)
        .eq('id', params.id)
        .eq('is_active', true)
        .single();

      if (fetchError || !data) {
        setError(true);
        setLoading(false);
        return;
      }

      const rawData = data as any;
      const ep: Episode = {
        ...rawData,
        podcasts: Array.isArray(rawData.podcasts) && rawData.podcasts.length > 0 ? rawData.podcasts[0] : rawData.podcasts,
      };
      setEpisode(ep);
      setCache(cacheKey, ep, 5 * 60 * 1000);
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

  if (error || !episode) {
    return (
      <div className="container py-12 md:py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">{t('common.error', language)}</h1>
          <p className="text-muted mb-6">Episode not found or unavailable.</p>
          <Link href="/episodes" className="inline-block px-6 py-2.5 rounded-lg bg-primary text-black font-semibold hover:opacity-90 transition">
            Back to Episodes
          </Link>
        </div>
      </div>
    );
  }

  const title = (language === 'rw' ? episode.title_rw : episode.title_en) || episode.title_en || episode.title_rw || t('episodes.untitled', language);
  const description = (language === 'rw' ? episode.description_rw : episode.description_en) || episode.description_en || episode.description_rw || '';
  const podcastTitle = episode.podcasts ? ((language === 'rw' ? episode.podcasts.title_rw : episode.podcasts.title_en) || episode.podcasts.title_en || episode.podcasts.title_rw) : null;
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleShare = async () => {
    const text = `${title}`;
    try {
      // Web Share API (mobile-friendly)
      if (navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
        return;
      }
    } catch {}
    // Fallback: copy link
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied!');
    } catch {
      window.open(shareUrl, '_blank');
    }
  };

  return (
    <div className="container py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <Link href="/episodes" className="inline-flex items-center text-sm text-muted hover:text-white mb-6 transition">
          ← Back to Episodes
        </Link>

        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          <div className="aspect-square rounded-xl bg-black/40 overflow-hidden ring-1 ring-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={episode.cover_image_url ?? '/hero-placeholder.png'} alt={title} className="w-full h-full object-cover" />
          </div>

          <div>
            {podcastTitle && <div className="text-sm text-primary font-semibold mb-2">{podcastTitle}</div>}
            <h1 className="text-3xl md:text-4xl font-bold mb-3">{title}</h1>
            
            <div className="flex items-center gap-4 text-sm text-muted mb-6">
              {episode.duration_seconds && <span>{formatDuration(episode.duration_seconds)}</span>}
              {episode.published_at && <span>•</span>}
              {episode.published_at && <span>{new Date(episode.published_at).toLocaleDateString()}</span>}
            </div>

            {description && (
              <div className="prose prose-invert max-w-none mb-6">
                <p className="text-muted whitespace-pre-wrap">{description}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button className="px-6 py-3 rounded-lg bg-primary text-black font-semibold hover:opacity-90 transition">
                ▶ Listen Now
              </button>
              <button className="px-6 py-3 rounded-lg bg-white/5 text-white font-semibold hover:bg-white/10 transition">
                + Add to Favorites
              </button>
              <button onClick={handleShare} className="px-6 py-3 rounded-lg bg-white/5 text-white font-semibold hover:bg-white/10 transition">
                Share
              </button>
            </div>

            {(episode.categories && episode.categories.length > 0) && (
              <div className="mt-4 flex gap-2 flex-wrap">
                {episode.categories.map((cat) => (
                  <span key={cat} className="px-2 py-0.5 rounded-full bg-white/5 text-xs text-muted">{cat}</span>
                ))}
              </div>
            )}

            <div className="mt-8 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-400">
                <strong>Note:</strong> Full playback and favorites are available in the mobile app. <Link href="/pricing" className="underline">Subscribe</Link> to unlock premium features.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-3 text-sm">
          <a href={`https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10">Share on X</a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10">Facebook</a>
          <a href={`https://wa.me/?text=${encodeURIComponent(title + ' ' + shareUrl)}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10">WhatsApp</a>
        </div>
      </div>
    </div>
  );
}
