"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getCache, setCache } from '@/lib/cache';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/i18n';

interface Episode {
  id: string;
  title_en: string | null;
  title_rw: string | null;
  cover_image_url: string | null;
  duration_seconds: number | null;
  published_at: string | null;
  categories?: string[] | null;
}

export default function EpisodesPage() {
  const { language } = useLanguage();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const cached = getCache<Episode[]>('episodes_recent_v1');
    if (cached && cached.length) {
      setEpisodes(cached);
      setLoading(false);
    }
    const load = async () => {
      const { data, error } = await supabase
        .from('episodes')
        .select('id, title_en, title_rw, cover_image_url, duration_seconds, published_at, categories')
        .eq('is_active', true)
        .order('published_at', { ascending: false })
        .limit(24);
      if (!error && data) {
        const rows = data as Episode[];
        setEpisodes(rows);
        setCache('episodes_recent_v1', rows, 60 * 1000);
      }
      setLoading(false);
    };
    load();
  }, []);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    for (const ep of episodes) {
      (ep.categories || []).forEach((c) => set.add(c));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [episodes]);

  const visibleEpisodes = useMemo(() => {
    if (!selectedCategory) return episodes;
    return episodes.filter((ep) => (ep.categories || []).includes(selectedCategory));
  }, [episodes, selectedCategory]);

  return (
    <div className="container py-12 md:py-16">
      <h1 className="text-3xl font-bold mb-6">{t('episodes.title', language)}</h1>
      {!loading && allCategories.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <button
            className={`px-3 py-1.5 rounded-full text-sm ${selectedCategory === null ? 'bg-primary text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat}
              className={`px-3 py-1.5 rounded-full text-sm ${selectedCategory === cat ? 'bg-primary text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-[var(--surface)] rounded-xl p-3 ring-1 ring-white/5">
              <div className="aspect-[4/3] rounded-lg bg-white/5 mb-3 animate-pulse" />
              <div className="h-3 w-24 bg-white/5 rounded mb-2 animate-pulse" />
              <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}
      {!loading && episodes.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎙️</div>
          <h2 className="text-xl font-semibold mb-2">No episodes yet</h2>
          <p className="text-muted">Check back soon for new content!</p>
        </div>
      )}
      {!loading && visibleEpisodes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {visibleEpisodes.map((ep) => (
            <Link key={ep.id} href={`/episodes/${ep.id}`} className="bg-[var(--surface)] rounded-xl p-3 ring-1 ring-white/5 hover:ring-white/20 transition">
              <div className="aspect-[4/3] rounded-lg bg-black/40 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ep.cover_image_url ?? '/hero-placeholder.png'} alt={ep.title_en ?? ep.title_rw ?? 'Episode'} className="w-full h-full object-cover" />
              </div>
              <div className="mt-3 text-xs text-muted">{t('episodes.episode', language)}</div>
              <div className="text-white font-semibold line-clamp-2">{(language === 'rw' ? ep.title_rw : ep.title_en) ?? ep.title_en ?? ep.title_rw ?? t('episodes.untitled', language)}</div>
              {(ep.categories && ep.categories.length > 0) && (
                <div className="mt-2 flex gap-1 flex-wrap">
                  {ep.categories.slice(0, 3).map((cat) => (
                    <span key={cat} className="px-2 py-0.5 rounded-full bg-white/5 text-xs text-muted">{cat}</span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
