"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/i18n';
import { FAV_KEY } from '../../lib/constants';

interface Episode {
  id: string;
  title_en?: string | null;
  title_rw?: string | null;
  cover_image_url?: string | null;
  podcast?: { title_en?: string | null; title_rw?: string | null } | null;
}

function getFavs(): string[] {
  if (typeof window === 'undefined') return [];
  try { const raw = localStorage.getItem(FAV_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function setFavs(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(FAV_KEY, JSON.stringify(ids)); } catch {}
}

export default function FavoritesPage() {
  const { language } = useLanguage();
  const [ids, setIds] = useState<string[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIds(getFavs());
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        if (!ids.length) { setEpisodes([]); return; }
        const { data } = await supabase
          .from('episodes')
          .select('id, title_en, title_rw, cover_image_url, podcast:podcasts(title_en, title_rw)')
          .in('id', ids);
        if (!active) return;
        const list = (data || []).filter(Boolean) as Episode[];
        const orderMap = new Map(ids.map((id, idx) => [id, idx] as const));
        list.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
        setEpisodes(list);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [ids]);

  const hasFavs = ids.length > 0;

  const removeFav = (id: string) => {
    const next = ids.filter((x) => x !== id);
    setIds(next);
    setFavs(next);
  };

  return (
    <div className="container py-12 md:py-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{language === 'rw' ? 'Ibikunzwe' : 'Favorites'}</h1>
          <p className="text-muted">{language === 'rw' ? 'Ibyo washyize mu bukunzwe' : 'Episodes you have favorited'}</p>
        </div>
        {hasFavs && (
          <button
            onClick={() => { setIds([]); setFavs([]); }}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition text-sm"
          >
            {language === 'rw' ? 'Siba byose' : 'Clear all'}
          </button>
        )}
      </div>

      {loading && (
        <div className="text-muted">{language === 'rw' ? 'Tegereza…' : 'Loading…'}</div>
      )}

      {!loading && !hasFavs && (
        <div className="bg-[var(--surface)] rounded-xl p-8 ring-1 ring-white/5 text-center">
          <div className="text-xl font-semibold mb-2">{language === 'rw' ? 'Nta bikunzwe' : 'No favorites yet'}</div>
          <p className="text-muted mb-4">{language === 'rw' ? 'Ongera usure ibiganiro maze ushyiremo ibikunze.' : 'Explore episodes and add some favorites.'}</p>
          <Link href="/" className="px-4 py-2 bg-primary text-black rounded-lg inline-block">{t('nav.home', language)}</Link>
        </div>
      )}

      {!loading && hasFavs && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {episodes.map((ep) => {
            const title = language === 'rw' ? (ep.title_rw ?? ep.title_en ?? 'Untitled') : (ep.title_en ?? ep.title_rw ?? 'Untitled');
            const podcastTitle = language === 'rw' ? (ep.podcast?.title_rw ?? ep.podcast?.title_en ?? '') : (ep.podcast?.title_en ?? ep.podcast?.title_rw ?? '');
            return (
              <div key={ep.id} className="bg-[var(--surface)] rounded-xl overflow-hidden ring-1 ring-white/5 flex flex-col">
                <Link href={`/episodes/${ep.id}`} className="relative block aspect-[4/3]">
                  <Image
                    src={ep.cover_image_url || '/placeholder.png'}
                    alt={title}
                    fill
                    className="object-cover"
                  />
                </Link>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="text-sm text-muted mb-1">{podcastTitle}</div>
                  <Link href={`/episodes/${ep.id}`} className="font-semibold leading-snug hover:underline line-clamp-2">{title}</Link>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <Link href={`/episodes/${ep.id}`} className="px-3 py-1.5 bg-primary text-black rounded-md text-sm">{language === 'rw' ? 'Tegeka' : 'Listen'}</Link>
                    <button onClick={() => removeFav(ep.id)} className="px-3 py-1.5 bg-white/10 text-white rounded-md text-sm hover:bg-white/20">
                      {language === 'rw' ? 'Kuraho' : 'Remove'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
