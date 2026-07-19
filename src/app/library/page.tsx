"use client";
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProgressItem {
  episode_id: string;
  podcast_id: string;
  position_seconds: number;
  duration_seconds: number | null;
  completed: boolean;
  last_listened_at: string;
  episodes: {
    id: string;
    title_en: string | null;
    title_rw: string | null;
    cover_image_url: string | null;
    duration_seconds: number | null;
    audio_url: string | null;
    status: string;
    podcasts: {
      id: string;
      title_en: string | null;
      title_rw: string | null;
      cover_image_url: string | null;
    } | null;
  } | null;
}

interface FavoriteItem {
  episode_id: string;
  favorited_at: string;
  episodes: {
    id: string;
    title_en: string | null;
    title_rw: string | null;
    description_en: string | null;
    description_rw: string | null;
    cover_image_url: string | null;
    duration_seconds: number | null;
    audio_url: string | null;
    status: string;
    podcast_id: string | null;
    podcasts: {
      id: string;
      title_en: string | null;
      title_rw: string | null;
      cover_image_url: string | null;
    } | null;
  } | null;
}

type Tab = 'continue' | 'recent' | 'favorites';

export default function LibraryPage() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('continue');
  const [continueItems, setContinueItems] = useState<ProgressItem[]>([]);
  const [recentItems, setRecentItems] = useState<ProgressItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  const fetchProgress = useCallback(async (type: 'continue' | 'recent') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return [];

    const res = await fetch(`/api/progress?type=${type}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  }, []);

  const fetchFavorites = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return [];

    const res = await fetch('/api/favorites', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.favorites || [];
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      const [cont, rec, favs] = await Promise.all([
        fetchProgress('continue'),
        fetchProgress('recent'),
        fetchFavorites(),
      ]);

      setContinueItems(cont);
      setRecentItems(rec);
      setFavorites(favs);
      setLoading(false);
    };
    load();
  }, [fetchProgress, fetchFavorites]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return language === 'rw' ? 'Ninga' : 'Just now';
    if (diffMins < 60) return language === 'rw' ? `Iminota ${diffMins}` : `${diffMins}m ago`;
    if (diffHours < 24) return language === 'rw' ? `Amasaha ${diffHours}` : `${diffHours}h ago`;
    if (diffDays < 7) return language === 'rw' ? `Iminsi ${diffDays}` : `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getProgressPercent = (item: ProgressItem) => {
    if (!item.duration_seconds) return 0;
    return Math.min(100, (item.position_seconds / item.duration_seconds) * 100);
  };

  if (loading) {
    return (
      <div className="container py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 w-32 bg-white/5 rounded mb-8 animate-pulse" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="w-16 h-16 rounded-lg bg-white/5 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; labelRw: string; count: number }[] = [
    { id: 'continue', label: 'Continue Listening', labelRw: 'Komeza Kumva', count: continueItems.length },
    { id: 'recent', label: 'Recently Played', labelRw: 'Ibyumviswe Vuba', count: recentItems.length },
    { id: 'favorites', label: 'Favorites', labelRw: 'Ibyo Ukunda', count: favorites.length },
  ];

  return (
    <div className="container py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">
          {language === 'rw' ? 'Isomero Ryawe' : 'Your Library'}
        </h1>
        <p className="text-muted mb-8">
          {language === 'rw' ? "Amateka y'ibyo wumvise, ibyo ukunda, n'ibice ukomeje kumva." : 'Your listening history, favorites, and episodes in progress'}
        </p>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition relative ${
                activeTab === tab.id
                  ? 'text-primary'
                  : 'text-muted hover:text-white'
              }`}
            >
              {language === 'rw' ? tab.labelRw : tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-white/10 text-muted'
                }`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Continue Listening */}
        {activeTab === 'continue' && (
          <div className="space-y-3">
            {continueItems.length === 0 ? (
              <EmptyState
                icon="headphones"
                title={language === 'rw' ? 'Nta gice kiri kumvikano' : 'No episodes in progress'}
                description={language === 'rw' ? 'Tangira kumva amakuru yigitangaza ukore progress yawe' : 'Start listening to podcasts and your progress will appear here'}
              />
            ) : (
              continueItems.map((item) => {
                if (!item.episodes) return null;
                const ep = item.episodes;
                const pod = ep.podcasts;
                const epTitle = (language === 'rw' ? ep.title_rw : ep.title_en) || ep.title_en || 'Untitled';
                const podTitle = pod ? ((language === 'rw' ? pod.title_rw : pod.title_en) || pod.title_en) : '';
                const cover = ep.cover_image_url || pod?.cover_image_url;
                const progressPercent = getProgressPercent(item);

                return (
                  <Link
                    key={item.episode_id}
                    href={`/episodes/${ep.id}`}
                    className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition group"
                  >
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-black/40 ring-1 ring-white/10">
                      {cover && (
                        <Image src={cover} alt="" fill sizes="64px" className="object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate group-hover:text-primary transition">{epTitle}</h3>
                      <p className="text-xs text-muted truncate">{podTitle}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${progressPercent}%` }} />
                        </div>
                        <span className="text-xs text-muted whitespace-nowrap">
                          {formatTime(item.position_seconds)} / {formatTime(item.duration_seconds || ep.duration_seconds || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition">
                        <svg className="w-5 h-5 text-primary ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}

        {/* Recently Played */}
        {activeTab === 'recent' && (
          <div className="space-y-3">
            {recentItems.length === 0 ? (
              <EmptyState
                icon="clock"
                title={language === 'rw' ? 'Nta makuru yumvwe' : 'No listening history yet'}
                description={language === 'rw' ? 'Tangira kumva amakuru yigitangaza' : 'Start listening to podcasts to build your history'}
              />
            ) : (
              recentItems.map((item) => {
                if (!item.episodes) return null;
                const ep = item.episodes;
                const pod = ep.podcasts;
                const epTitle = (language === 'rw' ? ep.title_rw : ep.title_en) || ep.title_en || 'Untitled';
                const podTitle = pod ? ((language === 'rw' ? pod.title_rw : pod.title_en) || pod.title_en) : '';
                const cover = ep.cover_image_url || pod?.cover_image_url;

                return (
                  <Link
                    key={item.episode_id}
                    href={`/episodes/${ep.id}`}
                    className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition group"
                  >
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-black/40 ring-1 ring-white/10">
                      {cover && (
                        <Image src={cover} alt="" fill sizes="64px" className="object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate group-hover:text-primary transition">{epTitle}</h3>
                      <p className="text-xs text-muted truncate">{podTitle}</p>
                      <p className="text-xs text-muted mt-1">{formatTimeAgo(item.last_listened_at)}</p>
                    </div>
                    {item.completed && (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400 font-medium">
                        {language === 'rw' ? 'Byarangiye' : 'Completed'}
                      </span>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        )}

        {/* Favorites */}
        {activeTab === 'favorites' && (
          <div className="space-y-3">
            {favorites.length === 0 ? (
              <EmptyState
                icon="heart"
                title={language === 'rw' ? 'Nta gice cyo gukunda' : 'No favorites yet'}
                description={language === 'rw' ? 'Kanda ku kibuno cyo kugirishwa ugere ku gice cyo gukunda' : 'Tap the heart icon on episodes to save them here'}
              />
            ) : (
              favorites.map((item) => {
                if (!item.episodes) return null;
                const ep = item.episodes;
                const pod = ep.podcasts;
                const epTitle = (language === 'rw' ? ep.title_rw : ep.title_en) || ep.title_en || 'Untitled';
                const podTitle = pod ? ((language === 'rw' ? pod.title_rw : pod.title_en) || pod.title_en) : '';
                const cover = ep.cover_image_url || pod?.cover_image_url;

                return (
                  <Link
                    key={item.episode_id}
                    href={`/episodes/${ep.id}`}
                    className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition group"
                  >
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-black/40 ring-1 ring-white/10">
                      {cover && (
                        <Image src={cover} alt="" fill sizes="64px" className="object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate group-hover:text-primary transition">{epTitle}</h3>
                      <p className="text-xs text-muted truncate">{podTitle}</p>
                      {ep.duration_seconds && (
                        <p className="text-xs text-muted mt-1">{formatTime(ep.duration_seconds)}</p>
                      )}
                    </div>
                    <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </Link>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  const icons: Record<string, React.ReactNode> = {
    headphones: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 13-14 0M3 21v-4a2 2 0 012-2h2v6H5a2 2 0 01-2-2zM21 21v-4a2 2 0 00-2-2h-2v6h2a2 2 0 002-2z" />
      </svg>
    ),
    clock: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    heart: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  };

  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center text-muted">
        {icons[icon]}
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-sm text-muted max-w-sm mx-auto">{description}</p>
      <Link
        href="/"
        className="inline-block mt-6 px-6 py-2.5 bg-primary text-black font-medium rounded-lg hover:opacity-90 transition"
      >
        Browse Podcasts
      </Link>
    </div>
  );
}
