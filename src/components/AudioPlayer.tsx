"use client";
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

interface Episode {
  id: string;
  title_en: string | null;
  title_rw: string | null;
  description_en: string | null;
  description_rw: string | null;
  cover_image_url: string | null;
  audio_url: string | null;
  duration_seconds: number | null;
}

interface Podcast {
  id: string;
  title_en: string | null;
  title_rw: string | null;
  cover_image_url: string | null;
}

interface AudioPlayerProps {
  episode: Episode;
  podcast: Podcast;
  streamUrl: string;
  onClose: () => void;
  onPlaybackEvent?: (eventType: string, extra?: Record<string, any>) => void;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export default function AudioPlayer({
  episode,
  podcast,
  streamUrl,
  onClose,
  onPlaybackEvent,
}: AudioPlayerProps) {
  const { language } = useLanguage();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const progressSaveRef = useRef<number>(0);

  // Initialize audio
  useEffect(() => {
    if (audioRef.current && streamUrl) {
      audioRef.current.src = streamUrl;
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.volume = volume;
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [streamUrl]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
        case 'ArrowUp':
          e.preventDefault();
          adjustVolume(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          adjustVolume(-0.1);
          break;
        case 'm':
        case 'M':
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, volume, isMuted]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
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

  const adjustVolume = (delta: number) => {
    const newVolume = Math.max(0, Math.min(1, volume + delta));
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const saveProgress = async (completed: boolean = false) => {
    if (!audioRef.current || !episode.id) return;
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      await fetch('/api/progress', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episode_id: episode.id,
          podcast_id: podcast.id,
          position_seconds: audioRef.current.currentTime,
          duration_seconds: audioRef.current.duration || 0,
          completed,
        }),
      });
    } catch {}
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
      progressSaveRef.current += 1;
      if (progressSaveRef.current >= 10) {
        progressSaveRef.current = 0;
        saveProgress(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const title = (language === 'rw' ? episode.title_rw : episode.title_en) || episode.title_en || 'Now Playing';
  const podcastTitle = (language === 'rw' ? podcast.title_rw : podcast.title_en) || podcast.title_en || '';
  const description = (language === 'rw' ? episode.description_rw : episode.description_en) || episode.description_en || '';

  return (
    <>
      {/* Mini Player */}
      {!isExpanded && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-lg border-t border-white/10 z-50">
          <div className="container py-3">
            <div className="flex items-center gap-4">
              {/* Episode artwork - clickable to expand */}
              <button
                onClick={() => setIsExpanded(true)}
                className="relative w-12 h-12 rounded-lg bg-black/40 overflow-hidden flex-shrink-0 ring-1 ring-white/10 hover:ring-primary/50 transition group"
                aria-label={language === 'rw' ? 'Himura umukino' : 'Expand player'}
              >
                {episode.cover_image_url || podcast.cover_image_url ? (
                  <Image
                    src={episode.cover_image_url || podcast.cover_image_url || ''}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                ) : null}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </div>
              </button>

              {/* Episode info */}
              <div className="flex-1 min-w-0 hidden sm:block">
                <p className="text-sm font-medium text-white truncate">{title}</p>
                <p className="text-xs text-muted truncate">{podcastTitle}</p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={skipBackward}
                  className="p-2 text-muted hover:text-white transition"
                  title="-15s"
                  aria-label="Skip back 15 seconds"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                  </svg>
                </button>
                
                <button
                  onClick={togglePlayPause}
                  className="w-10 h-10 rounded-full bg-primary text-black flex items-center justify-center hover:opacity-90 transition"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isBuffering ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth={3} className="opacity-25" />
                      <path strokeLinecap="round" strokeWidth={3} d="M12 2a10 10 0 0110 10" />
                    </svg>
                  ) : isPlaying ? (
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
                  aria-label="Skip forward 15 seconds"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                  </svg>
                </button>
              </div>

              {/* Progress bar */}
              <div className="flex-1 hidden md:flex items-center gap-3">
                <span className="text-xs text-muted w-10 text-right">{formatTime(progress)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={progress}
                  onChange={handleSeek}
                  className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
                />
                <span className="text-xs text-muted w-10">{formatTime(duration)}</span>
              </div>

              {/* Volume control */}
              <div className="hidden lg:flex items-center gap-2 relative">
                <button
                  onClick={toggleMute}
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  className="p-2 text-muted hover:text-white transition"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : volume < 0.5 ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
                {showVolumeSlider && (
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-black/95 backdrop-blur-lg border border-white/10 rounded-lg"
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setVolume(v);
                        if (audioRef.current) audioRef.current.volume = v;
                        if (v > 0 && isMuted) setIsMuted(false);
                      }}
                      className="h-20 w-1 bg-white/20 rounded-full appearance-none cursor-pointer [writing-mode:vertical-lr] [direction:rtl] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                    />
                  </div>
                )}
              </div>

              {/* Speed control */}
              <div className="hidden lg:block relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="px-3 py-1.5 text-xs font-medium text-muted hover:text-white transition rounded-lg hover:bg-white/5"
                >
                  {playbackSpeed}x
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 p-1 bg-black/95 backdrop-blur-lg border border-white/10 rounded-lg min-w-[80px]">
                    {PLAYBACK_SPEEDS.map((speed) => (
                      <button
                        key={speed}
                        onClick={() => changeSpeed(speed)}
                        className={`block w-full px-3 py-1.5 text-xs text-left rounded transition ${
                          speed === playbackSpeed
                            ? 'bg-primary/20 text-primary font-medium'
                            : 'text-muted hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="p-2 text-muted hover:text-white transition"
                aria-label="Close player"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Player Modal */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black z-50 overflow-y-auto">
          <div className="container py-8 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 text-muted hover:text-white transition"
                aria-label="Collapse player"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <h2 className="text-sm font-medium text-muted">{language === 'rw' ? 'Urimo Kumva' : 'Now Playing'}</h2>
              <button
                onClick={onClose}
                className="p-2 text-muted hover:text-white transition"
                aria-label="Close player"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Large Artwork */}
            <div className="relative aspect-square rounded-2xl bg-black/40 overflow-hidden ring-1 ring-white/10 mb-8">
              {episode.cover_image_url || podcast.cover_image_url ? (
                <Image
                  src={episode.cover_image_url || podcast.cover_image_url || ''}
                  alt={title}
                  fill
                  sizes="(max-width: 768px) 100vw, 600px"
                  className="object-cover"
                  priority
                />
              ) : null}
            </div>

            {/* Episode Info */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
              <Link href={`/podcasts/${podcast.id}`} className="text-muted hover:text-primary transition">
                {podcastTitle}
              </Link>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={progress}
                onChange={handleSeek}
                className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
              />
              <div className="flex justify-between text-xs text-muted mt-2">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Main Controls */}
            <div className="flex items-center justify-center gap-6 mb-8">
              <button
                onClick={skipBackward}
                className="p-3 text-white hover:text-primary transition"
                title="-15s"
                aria-label="Skip back 15 seconds"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                </svg>
              </button>
              
              <button
                onClick={togglePlayPause}
                className="w-16 h-16 rounded-full bg-primary text-black flex items-center justify-center hover:opacity-90 transition shadow-lg shadow-primary/20"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isBuffering ? (
                  <svg className="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth={3} className="opacity-25" />
                    <path strokeLinecap="round" strokeWidth={3} d="M12 2a10 10 0 0110 10" />
                  </svg>
                ) : isPlaying ? (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                onClick={skipForward}
                className="p-3 text-white hover:text-primary transition"
                title="+15s"
                aria-label="Skip forward 15 seconds"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                </svg>
              </button>
            </div>

            {/* Secondary Controls */}
            <div className="flex items-center justify-between mb-8">
              {/* Speed */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-muted hover:text-white transition rounded-lg hover:bg-white/5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {playbackSpeed}x
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full left-0 mb-2 p-1 bg-black/95 backdrop-blur-lg border border-white/10 rounded-lg min-w-[80px]">
                    {PLAYBACK_SPEEDS.map((speed) => (
                      <button
                        key={speed}
                        onClick={() => changeSpeed(speed)}
                        className={`block w-full px-3 py-1.5 text-sm text-left rounded transition ${
                          speed === playbackSpeed
                            ? 'bg-primary/20 text-primary font-medium'
                            : 'text-muted hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Volume */}
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleMute}
                  className="p-2 text-muted hover:text-white transition"
                >
                  {isMuted || volume === 0 ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    if (audioRef.current) audioRef.current.volume = v;
                    if (v > 0 && isMuted) setIsMuted(false);
                  }}
                  className="w-24 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                />
              </div>
            </div>

            {/* Description */}
            {description && (
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-2">
                  {language === 'rw' ? 'Ibisobanuro' : 'Description'}
                </h3>
                <p className="text-sm text-muted leading-relaxed">{description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          setIsPlaying(false);
          saveProgress(true);
          onPlaybackEvent?.('episode_completed', { completed: true });
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
      />
    </>
  );
}
