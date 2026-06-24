"use client";
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { FAV_KEY } from '@/lib/constants';
import { getCache, setCache } from '@/lib/cache';
import { useLanguage } from '../../../contexts/LanguageContext';
import { t } from '../../../lib/i18n';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type ListenQueueItem = {
  id: string;
  episode_id: string;
  session_id: string;
  duration_seconds: number;
  completed: boolean;
  language: string;
  attempt: number;
  next_retry_at: number;
};

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;
const QUEUE_KEY = 'nova_listen_queue_v1';

function getQueue(): ListenQueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setQueue(queue: ListenQueueItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

function getFavs(): string[] {
  if (typeof window === 'undefined') return [];
  try { const raw = localStorage.getItem(FAV_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function setFavs(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(FAV_KEY, JSON.stringify(ids)); } catch {}
}

function removeFromQueue(id: string): void {
  const queue = getQueue();
  setQueue(queue.filter((item) => item.id !== id));
}

function addToQueue(item: Omit<ListenQueueItem, 'id' | 'attempt' | 'next_retry_at'>): void {
  const queue = getQueue();
  const newItem: ListenQueueItem = {
    ...item,
    id: generateUUID(),
    attempt: 0,
    next_retry_at: Date.now(),
  };
  queue.push(newItem);
  setQueue(queue);
}

function processQueueFlush(sendFn: (item: ListenQueueItem) => Promise<boolean>): void {
  const now = Date.now();
  const queue = getQueue();
  queue.forEach((item) => {
    if (item.next_retry_at <= now) {
      sendFn(item).then((ok) => {
        if (ok) {
          removeFromQueue(item.id);
        } else {
          const nextAttempt = item.attempt + 1;
          if (nextAttempt > MAX_RETRIES) {
            removeFromQueue(item.id);
            return;
          }
          const delay = Math.min(BASE_DELAY_MS * Math.pow(2, nextAttempt), 30000);
          const updated: ListenQueueItem = {
            ...item,
            attempt: nextAttempt,
            next_retry_at: now + delay,
          };
          const q = getQueue();
          const idx = q.findIndex((i) => i.id === item.id);
          if (idx !== -1) {
            q[idx] = updated;
            setQueue(q);
          }
        }
      });
    }
  });
}

interface Props { params: { id: string } }

interface Episode {
  id: string;
  title_en: string | null;
  title_rw: string | null;
  description_en?: string | null;
  description_rw?: string | null;
  cover_image_url: string | null;
  audio_url: string | null;
  duration_seconds: number | null;
  published_at: string | null;
  podcast_id?: string | null;
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
  const [relatedEpisodes, setRelatedEpisodes] = useState<Episode[]>([]);
  const [fav, setFav] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const lastTimeRef = useRef<number>(0);
  const accRef = useRef<number>(0);
  const sessionIdRef = useRef<string>('');
  const isOnlineRef = useRef<boolean>(true);

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
          audio_url,
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

      // Fetch related episodes by categories
      if (ep.categories && ep.categories.length > 0) {
        const { data: related } = await supabase
          .from('episodes')
          .select('id, title_en, title_rw, cover_image_url, audio_url, duration_seconds, published_at, categories')
          .eq('is_active', true)
          .neq('id', params.id)
          .limit(4);

        if (related) {
          const filtered = related.filter((r: any) =>
            r.categories?.some((c: string) => ep.categories?.includes(c))
          );
          setRelatedEpisodes(filtered.slice(0, 4));
        }
      }
    };

    load();
  }, [params.id]);

  useEffect(() => {
    const favs = getFavs();
    setFav(favs.includes(params.id));
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

  const sendListenItem = useCallback(async (item: ListenQueueItem): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return false;
      const res = await fetch('/api/metrics/listen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          episode_id: item.episode_id,
          client: 'web',
          language: item.language,
          duration_seconds: item.duration_seconds,
          completed: item.completed,
          session_id: item.session_id,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const onOnline = () => {
      isOnlineRef.current = true;
      processQueueFlush(sendListenItem);
    };
    const onOffline = () => { isOnlineRef.current = false; };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    isOnlineRef.current = navigator.onLine;
    const interval = setInterval(() => {
      if (isOnlineRef.current) processQueueFlush(sendListenItem);
    }, 30000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(interval);
    };
  }, [sendListenItem]);

  const postListen = async (payload: { duration_seconds?: number; completed?: boolean }) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    const item = {
      episode_id: params.id,
      session_id: sessionIdRef.current || generateUUID(),
      duration_seconds: Math.max(0, Math.round(payload.duration_seconds || 0)),
      completed: !!payload.completed,
      language,
    };
    if (!sessionIdRef.current) {
      sessionIdRef.current = item.session_id;
    }
    if (!isOnlineRef.current) {
      addToQueue(item);
      return;
    }
    const ok = await sendListenItem({ ...item, id: '', attempt: 0, next_retry_at: Date.now() });
    if (!ok) {
      addToQueue(item);
    }
  };

  const handleAudioPlay = async () => {
    isPlayingRef.current = true;
    const el = audioRef.current;
    lastTimeRef.current = el ? el.currentTime : 0;
    // Generate new session for each distinct play start
    sessionIdRef.current = generateUUID();
    // mark a start event (0 sec) to count a listen start
    await postListen({ duration_seconds: 0, completed: false });
  };

  const handleAudioPause = async () => {
    if (!isPlayingRef.current) return;
    isPlayingRef.current = false;
    if (accRef.current > 0) {
      const toSend = accRef.current;
      accRef.current = 0;
      await postListen({ duration_seconds: toSend, completed: false });
    }
  };

  const handleAudioEnded = async () => {
    const el = audioRef.current;
    const remaining = accRef.current;
    accRef.current = 0;
    if (remaining > 0) {
      await postListen({ duration_seconds: remaining, completed: false });
    }
    await postListen({ duration_seconds: Math.round(el?.duration || el?.currentTime || 0), completed: true });
    isPlayingRef.current = false;
  };

  const handleTimeUpdate = async () => {
    const el = audioRef.current;
    if (!isPlayingRef.current || !el) return;
    const now = el.currentTime;
    const delta = Math.max(0, now - lastTimeRef.current);
    lastTimeRef.current = now;
    accRef.current += delta;
    if (accRef.current >= 15) {
      const toSend = accRef.current;
      accRef.current = 0;
      await postListen({ duration_seconds: toSend, completed: false });
    }
  };

  const handleListenNow = () => {
    try { audioRef.current?.play(); } catch {}
  };

  return (
    <>
      <Head>
        <title>{title} | Nova Podcast</title>
        <meta name="description" content={description || `Listen to ${title} on Nova Podcast`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description || `Listen to ${title} on Nova Podcast`} />
        <meta property="og:image" content={episode.cover_image_url || 'https://nova.co.rw/hero-placeholder.png'} />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:type" content="music.song" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description || `Listen to ${title} on Nova Podcast`} />
        <meta name="twitter:image" content={episode.cover_image_url || 'https://nova.co.rw/hero-placeholder.png'} />
        <link rel="canonical" href={shareUrl} />
      </Head>
      <div className="container py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <Link href="/episodes" className="inline-flex items-center text-sm text-muted hover:text-white mb-6 transition">
            ← Back to Episodes
          </Link>

        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          <div className="relative aspect-square rounded-xl bg-black/40 overflow-hidden ring-1 ring-white/5">
            <Image
              src={episode.cover_image_url ?? '/hero-placeholder.png'}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, 300px"
              className="object-cover"
            />
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
              <button onClick={handleListenNow} className="px-6 py-3 rounded-lg bg-primary text-black font-semibold hover:opacity-90 transition">
                ▶ Listen Now
              </button>
              <button onClick={toggleFav} className={`px-6 py-3 rounded-lg font-semibold transition ${fav ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                {fav ? '✓ In Favorites' : '+ Add to Favorites'}
              </button>
              <button onClick={handleShare} className="px-6 py-3 rounded-lg bg-white/5 text-white font-semibold hover:bg-white/10 transition">
                Share
              </button>
            </div>

            {episode.audio_url && (
              <audio
                ref={audioRef}
                src={episode.audio_url}
                controls
                className="w-full mt-4"
                onPlay={handleAudioPlay}
                onPause={handleAudioPause}
                onEnded={handleAudioEnded}
                onTimeUpdate={handleTimeUpdate}
              />
            )}

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

        {relatedEpisodes.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Related Episodes</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {relatedEpisodes.map((ep) => (
                <Link key={ep.id} href={`/episodes/${ep.id}`} className="bg-[var(--surface)] rounded-xl p-3 ring-1 ring-white/5 hover:ring-white/20 transition">
                  <div className="relative aspect-[4/3] rounded-lg bg-black/40 overflow-hidden">
                    <Image
                      src={ep.cover_image_url ?? '/hero-placeholder.png'}
                      alt={ep.title_en ?? ep.title_rw ?? 'Episode'}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="mt-3 text-xs text-muted">{t('episodes.episode', language)}</div>
                  <div className="text-white font-semibold line-clamp-2">{(language === 'rw' ? ep.title_rw : ep.title_en) ?? ep.title_en ?? ep.title_rw ?? t('episodes.untitled', language)}</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
