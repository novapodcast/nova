"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/contexts/LanguageContext';

interface ShareButtonProps {
  episodeId?: string;
  podcastId?: string;
  title: string;
  variant?: 'icon' | 'full';
}

export default function ShareButton({ episodeId, podcastId, title, variant = 'icon' }: ShareButtonProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = language === 'rw' ? `Reba "${title}" kuri Nova` : `Listen to "${title}" on Nova`;

  const trackShare = async (platform: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      await fetch('/api/shares', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          episode_id: episodeId,
          podcast_id: podcastId,
          platform,
          share_type: 'link',
        }),
      });
    } catch {}
  };

  const handleShare = async (platform: string, url?: string) => {
    trackShare(platform);
    
    if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    } else if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    }
    
    setOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (open && !(e.target as HTMLElement).closest('[data-share-menu]')) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (variant === 'icon') {
    return (
      <div className="relative" data-share-menu>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 text-muted hover:text-white transition rounded-lg hover:bg-white/5"
          aria-label={language === 'rw' ? 'Sangiza' : 'Share'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
        {open && (
          <div className="absolute bottom-full right-0 mb-2 p-2 bg-black/95 backdrop-blur-lg border border-white/10 rounded-xl min-w-[180px] shadow-xl">
            <button
              onClick={() => handleShare('whatsapp')}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left text-white hover:bg-white/5 rounded-lg transition"
            >
              <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-xs">WA</span>
              WhatsApp
            </button>
            <button
              onClick={() => handleShare('twitter')}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left text-white hover:bg-white/5 rounded-lg transition"
            >
              <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">X</span>
              Twitter / X
            </button>
            <button
              onClick={() => handleShare('facebook')}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left text-white hover:bg-white/5 rounded-lg transition"
            >
              <span className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-500 font-bold text-xs">FB</span>
              Facebook
            </button>
            <div className="h-px bg-white/10 my-1" />
            <button
              onClick={() => handleShare('copy')}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left text-white hover:bg-white/5 rounded-lg transition"
            >
              <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {copied ? (language === 'rw' ? 'Byakopiwe!' : 'Copied!') : (language === 'rw' ? 'Kopi link' : 'Copy link')}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" data-share-menu>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        {language === 'rw' ? 'Sangiza' : 'Share'}
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 p-2 bg-black/95 backdrop-blur-lg border border-white/10 rounded-xl min-w-[180px] shadow-xl z-50">
          <button
            onClick={() => handleShare('whatsapp')}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left text-white hover:bg-white/5 rounded-lg transition"
          >
            <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-xs">WA</span>
            WhatsApp
          </button>
          <button
            onClick={() => handleShare('twitter')}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left text-white hover:bg-white/5 rounded-lg transition"
          >
            <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">X</span>
            Twitter / X
          </button>
          <button
            onClick={() => handleShare('facebook')}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left text-white hover:bg-white/5 rounded-lg transition"
          >
            <span className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-500 font-bold text-xs">FB</span>
            Facebook
          </button>
          <div className="h-px bg-white/10 my-1" />
          <button
            onClick={() => handleShare('copy')}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left text-white hover:bg-white/5 rounded-lg transition"
          >
            <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {copied ? (language === 'rw' ? 'Byakopiwe!' : 'Copied!') : (language === 'rw' ? 'Kopi link' : 'Copy link')}
          </button>
        </div>
      )}
    </div>
  );
}
