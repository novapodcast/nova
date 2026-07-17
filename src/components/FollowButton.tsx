"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/contexts/LanguageContext';

interface FollowButtonProps {
  podcastId: string;
}

export default function FollowButton({ podcastId }: FollowButtonProps) {
  const { language } = useLanguage();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkFollowing();
  }, [podcastId]);

  const checkFollowing = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthChecked(true);
      if (!session?.access_token) return;

      const res = await fetch('/api/follows', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const isFollowing = (data.follows || []).some((f: any) => f.podcast_id === podcastId);
        setFollowing(isFollowing);
      }
    } catch {
      setAuthChecked(true);
    }
  };

  const toggleFollow = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    setLoading(true);
    const wasFollowing = following;
    setFollowing(!wasFollowing);

    try {
      await fetch('/api/follows', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          podcast_id: podcastId,
          action: wasFollowing ? 'unfollow' : 'follow',
        }),
      });
    } catch {
      setFollowing(wasFollowing);
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/5 text-muted text-sm font-medium"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        {language === 'rw' ? 'Kurikirana' : 'Follow'}
      </button>
    );
  }

  return (
    <button
      onClick={toggleFollow}
      disabled={loading}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition text-sm font-medium ${
        following
          ? 'bg-white/10 text-white hover:bg-white/20'
          : 'bg-primary text-black hover:opacity-90'
      }`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {following ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        )}
      </svg>
      {following
        ? (language === 'rw' ? 'Ukurikirana' : 'Following')
        : (language === 'rw' ? 'Kurikirana' : 'Follow')}
    </button>
  );
}
