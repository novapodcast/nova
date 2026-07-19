"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/contexts/LanguageContext';

interface FavoriteButtonProps {
  episodeId: string;
  variant?: 'icon' | 'full';
  initialFavorited?: boolean;
}

export default function FavoriteButton({ episodeId, variant = 'icon', initialFavorited }: FavoriteButtonProps) {
  const { language } = useLanguage();
  const [favorited, setFavorited] = useState(initialFavorited ?? false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialFavorited === undefined) {
      checkFavorited();
    }
  }, [episodeId]);

  const checkFavorited = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch('/api/favorites', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const isFav = (data.favorites || []).some((f: any) => f.episode_id === episodeId);
        setFavorited(isFav);
      }
    } catch {}
  };

  const toggleFavorite = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return;
    }

    setLoading(true);
    const wasFavorited = favorited;
    setFavorited(!wasFavorited);

    try {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episode_id: episodeId,
          action: wasFavorited ? 'remove' : 'add',
        }),
      });
    } catch {
      setFavorited(wasFavorited);
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleFavorite}
        disabled={loading}
        className={`p-2 transition rounded-lg hover:bg-white/5 ${
          favorited ? 'text-red-400' : 'text-muted hover:text-white'
        }`}
        aria-label={favorited ? (language === 'rw' ? 'Kuramo ibyo ukunda' : 'Remove from favorites') : (language === 'rw' ? 'Shyira mu byo ukunda' : 'Add to favorites')}
      >
        <svg className="w-5 h-5" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm ${
        favorited
          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
          : 'bg-white/5 text-white hover:bg-white/10'
      }`}
    >
      <svg className="w-4 h-4" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      {favorited
        ? (language === 'rw' ? 'Mu byizewe' : 'Favorited')
        : (language === 'rw' ? 'Shyira mu byizewe' : 'Add to Favorites')}
    </button>
  );
}
