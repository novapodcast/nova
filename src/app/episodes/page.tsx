"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/i18n';

interface Episode {
  id: string;
  title_en: string | null;
  title_rw: string | null;
  cover_image_url: string | null;
  duration_seconds: number | null;
  published_at: string | null;
}

export default function EpisodesPage() {
  const { language } = useLanguage();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('episodes')
        .select('id, title_en, title_rw, cover_image_url, duration_seconds, published_at')
        .eq('is_active', true)
        .order('published_at', { ascending: false })
        .limit(24);
      if (!error && data) setEpisodes(data as Episode[]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="container py-12 md:py-16">
      <h1 className="text-3xl font-bold mb-6">{t('episodes.title', language)}</h1>
      {loading && <div className="text-muted">{t('common.loading', language)}</div>}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {episodes.map((ep) => (
            <Link key={ep.id} href={`/episodes/${ep.id}`} className="bg-[var(--surface)] rounded-xl p-3 ring-1 ring-white/5 hover:ring-white/20 transition">
              <div className="aspect-[4/3] rounded-lg bg-black/40 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ep.cover_image_url ?? '/hero-placeholder.png'} alt={ep.title_en ?? ep.title_rw ?? 'Episode'} className="w-full h-full object-cover" />
              </div>
              <div className="mt-3 text-xs text-muted">{t('episodes.episode', language)}</div>
              <div className="text-white font-semibold line-clamp-2">{(language === 'rw' ? ep.title_rw : ep.title_en) ?? ep.title_en ?? ep.title_rw ?? t('episodes.untitled', language)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
