"use client";
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { fetchPublicPodcastById } from '@/lib/data/podcasts';
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
  updated_at: string | null;
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
  
  // In-page audio player state
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: pod, error: podError } = await fetchPublicPodcastById(params.id);

      if (podError || !pod) {
        setError(true);
        setLoading(false);
        return;
      }
      setPodcast(pod as unknown as Podcast);

      // Fetch episodes in chronological order (oldest first)
      const { data: eps } = await supabase
        .from('episodes')
        .select('id, title_en, title_rw, description_en, description_rw, cover_image_url, audio_url, duration_seconds, published_at, episode_number, categories')
        .eq('podcast_id', params.id)
        .eq('is_active', true)
        .order('published_at', { ascending: true });

      if (eps) setEpisodes(eps as Episode[]);
      setLoading(false);
    };
    load();
  }, [params.id]);

  // Audio player handlers
  const playEpisode = (episode: Episode) => {
    if (currentEpisode?.id === episode.id) {
      // Toggle play/pause for current episode
      if (isPlaying) {
        audioRef.current?.pause();
      } else {
        audioRef.current?.play();
      }
      setIsPlaying(!isPlaying);
    } else {
      // Play new episode
      setCurrentEpisode(episode);
      setIsPlaying(true);
      setProgress(0);
    }
  };

  useEffect(() => {
    if (currentEpisode && audioRef.current) {
      audioRef.current.src = currentEpisode.audio_url || '';
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [currentEpisode]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 15, duration);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 15, 0);
    }
  };

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

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return language === 'rw' ? 'Uyu munsi' : 'Today';
    if (diffDays === 1) return language === 'rw' ? 'Ejo' : 'Yesterday';
    if (diffDays < 7) return language === 'rw' ? `Hashize iminsi ${diffDays}` : `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return language === 'rw' ? `Hashize icyumweru ${weeks}` : `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return language === 'rw' ? `Hashize ukwezi ${months}` : `${months} month${months > 1 ? 's' : ''} ago`;
    }
    const years = Math.floor(diffDays / 365);
    return language === 'rw' ? `Hashize umwaka ${years}` : `${years} year${years > 1 ? 's' : ''} ago`;
  };

  const formatPlayerTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
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
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{title}</h1>
            {podcast.speaker_name && (
              <div className="text-primary font-semibold mb-4">{podcast.speaker_name}</div>
            )}
            
            {/* Podcast statistics */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm mb-5">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span className="text-white font-medium">{episodes.length}</span>
                <span className="text-muted">{language === 'rw' ? 'ibice' : 'Episodes'}</span>
              </div>
              {(podcast.total_listeners ?? 0) > 0 && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="text-white font-medium">{formatCount(podcast.total_listeners)}</span>
                  <span className="text-muted">{language === 'rw' ? 'abumva' : 'Plays'}</span>
                </div>
              )}
              {podcast.updated_at && (
                <div className="flex items-center gap-2 text-muted">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{language === 'rw' ? 'Byavuguruwe' : 'Updated'} {formatTimeAgo(podcast.updated_at)}</span>
                </div>
              )}
            </div>
            
            {description && (
              <p className="text-muted leading-relaxed whitespace-pre-wrap">{description}</p>
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
            <div className="space-y-2">
              {episodes.map((ep, idx) => {
                const epTitle = (language === 'rw' ? ep.title_rw : ep.title_en) || ep.title_en || ep.title_rw || 'Untitled';
                const epDesc = (language === 'rw' ? ep.description_rw : ep.description_en) || '';
                const isCurrentEpisode = currentEpisode?.id === ep.id;
                const episodeNum = ep.episode_number ?? idx + 1;

                return (
                  <div
                    key={ep.id}
                    className={`flex gap-4 rounded-xl p-4 ring-1 transition-all ${
                      isCurrentEpisode 
                        ? 'bg-primary/10 ring-primary/30' 
                        : 'bg-[var(--surface)] ring-white/5 hover:ring-white/15'
                    }`}
                  >
                    {/* Play button */}
                    <button
                      onClick={() => playEpisode(ep)}
                      disabled={!ep.audio_url}
                      className={`relative w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${
                        ep.audio_url 
                          ? isCurrentEpisode && isPlaying
                            ? 'bg-primary text-black'
                            : 'bg-white/10 hover:bg-primary hover:text-black text-white'
                          : 'bg-white/5 text-muted cursor-not-allowed'
                      }`}
                    >
                      {isCurrentEpisode && isPlaying ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>

                    {/* Episode info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-primary">
                          {language === 'rw' ? `Igice ${episodeNum}` : `Episode ${episodeNum}`}
                        </span>
                        {ep.published_at && (
                          <>
                            <span className="text-muted">•</span>
                            <span className="text-xs text-muted">
                              {new Date(ep.published_at).toLocaleDateString(language === 'rw' ? 'en-GB' : 'en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className={`font-semibold line-clamp-1 ${isCurrentEpisode ? 'text-primary' : 'text-white'}`}>
                        {epTitle}
                      </h3>
                      {epDesc && (
                        <p className="text-sm text-muted line-clamp-2 mt-1 leading-relaxed">{epDesc}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted mt-2">
                        {ep.duration_seconds != null && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatDuration(ep.duration_seconds)}
                          </span>
                        )}
                        {!ep.audio_url && (
                          <span className="text-amber-500/80">{language === 'rw' ? 'Ntabwo iboneka' : 'Coming soon'}</span>
                        )}
                      </div>
                    </div>

                    {/* Link to full episode page */}
                    <Link
                      href={`/episodes/${ep.id}`}
                      className="self-center p-2 rounded-lg text-muted hover:text-white hover:bg-white/5 transition"
                      title={language === 'rw' ? 'Reba byose' : 'View details'}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      {/* Sticky audio player */}
      {currentEpisode && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-lg border-t border-white/10 z-50">
          <div className="container py-3">
            <div className="flex items-center gap-4">
              {/* Episode artwork */}
              <div className="relative w-12 h-12 rounded-lg bg-black/40 overflow-hidden flex-shrink-0 ring-1 ring-white/10">
                {currentEpisode.cover_image_url ? (
                  <Image
                    src={currentEpisode.cover_image_url}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                ) : podcast?.cover_image_url ? (
                  <Image
                    src={podcast.cover_image_url}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                ) : null}
              </div>

              {/* Episode info */}
              <div className="flex-1 min-w-0 hidden sm:block">
                <p className="text-sm font-medium text-white truncate">
                  {(language === 'rw' ? currentEpisode.title_rw : currentEpisode.title_en) || currentEpisode.title_en || 'Now Playing'}
                </p>
                <p className="text-xs text-muted truncate">{title}</p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={skipBackward}
                  className="p-2 text-muted hover:text-white transition"
                  title="-15s"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                  </svg>
                </button>
                
                <button
                  onClick={() => playEpisode(currentEpisode)}
                  className="w-10 h-10 rounded-full bg-primary text-black flex items-center justify-center hover:opacity-90 transition"
                >
                  {isPlaying ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={skipForward}
                  className="p-2 text-muted hover:text-white transition"
                  title="+15s"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                  </svg>
                </button>
              </div>

              {/* Progress bar */}
              <div className="flex-1 hidden md:flex items-center gap-3">
                <span className="text-xs text-muted w-10 text-right">{formatPlayerTime(progress)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={progress}
                  onChange={handleSeek}
                  className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                />
                <span className="text-xs text-muted w-10">{formatPlayerTime(duration)}</span>
              </div>

              {/* Close button */}
              <button
                onClick={() => {
                  audioRef.current?.pause();
                  setCurrentEpisode(null);
                  setIsPlaying(false);
                }}
                className="p-2 text-muted hover:text-white transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom padding when player is visible */}
      {currentEpisode && <div className="h-20" />}
    </div>
  );
}
