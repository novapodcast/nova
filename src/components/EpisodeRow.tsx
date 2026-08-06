"use client";
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export interface EpisodeRowData {
  id: string;
  title_en?: string | null;
  title_rw?: string | null;
  description_en?: string | null;
  description_rw?: string | null;
  cover_image_url?: string | null;
  podcast_title_en?: string | null;
  podcast_title_rw?: string | null;
  published_at?: string | null;
  duration_seconds?: number | null;
  href?: string; // If present, wrap with Link; otherwise allow custom right slot
}

interface EpisodeRowProps {
  data: EpisodeRowData;
  rightSlot?: React.ReactNode; // e.g., play/progress/actions
  onPlay?: () => void;
  compact?: boolean; // reserved for future variants
  bodyBelow?: React.ReactNode; // extra inline row under metadata
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function EpisodeRow({ data, rightSlot, onPlay, bodyBelow }: EpisodeRowProps) {
  const { language } = useLanguage();
  const title = (language === 'rw' ? data.title_rw : data.title_en) || data.title_en || data.title_rw || 'Untitled';
  const desc = (language === 'rw' ? data.description_rw : data.description_en) || data.description_en || data.description_rw || '';
  const podTitle = (language === 'rw' ? data.podcast_title_rw : data.podcast_title_en) || data.podcast_title_en || '';

  const content = (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 hover:ring-white/20 transition group">
      {/* Thumbnail */}
      <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-black/40 ring-1 ring-white/10">
        {data.cover_image_url && (
          <Image src={data.cover_image_url} alt="" fill sizes="56px" className="object-cover" />
        )}
      </div>
      {/* Optional play button */}
      {onPlay && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPlay(); }}
          className="w-10 h-10 rounded-full self-center flex-shrink-0 flex items-center justify-center bg-white/10 text-white hover:bg-primary hover:text-black transition"
          aria-label="Play"
        >
          <svg className="w-4.5 h-4.5 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}
      {/* Body */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white line-clamp-1 group-hover:text-primary transition-colors">{title}</h3>
        {podTitle && <p className="text-xs text-muted truncate">{podTitle}</p>}
        {desc && <p className="text-sm text-muted line-clamp-1 mt-0.5">{desc}</p>}
        <div className="flex items-center gap-2 text-xs text-muted mt-1.5">
          {data.published_at && (
            <span>{new Date(data.published_at).toLocaleDateString(language === 'rw' ? 'en-GB' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          )}
          {data.published_at && data.duration_seconds != null && <span>•</span>}
          {data.duration_seconds != null && <span>{formatDuration(data.duration_seconds)}</span>}
        </div>
        {bodyBelow && (
          <div className="mt-2">{bodyBelow}</div>
        )}
      </div>
      {/* Right slot (play/progress) */}
      {rightSlot}
    </div>
  );

  if (data.href) {
    return (
      <Link href={data.href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
