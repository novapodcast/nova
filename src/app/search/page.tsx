"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/contexts/LanguageContext';
import { selectPublicPodcasts } from '@/lib/data/podcasts';

interface SearchResult {
  type: 'podcast' | 'episode';
  id: string;
  title: string;
  subtitle: string;
  cover_image_url: string | null;
  href: string;
}

export default function SearchPage() {
  const { language } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('nova_recent_searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored).slice(0, 5));
      } catch {}
    }
  }, []);

  const saveRecentSearch = (q: string) => {
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('nova_recent_searches', JSON.stringify(updated));
  };

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const [podRes, epRes] = await Promise.all([
        selectPublicPodcasts(supabase)
          .or(`title_en.ilike.%${q}%,title_rw.ilike.%${q}%,speaker_name.ilike.%${q}%`)
          .limit(10),
        supabase
          .from('episodes')
          .select(`
            id, title_en, title_rw, description_en, description_rw, cover_image_url, status,
            podcasts(id, title_en, title_rw, cover_image_url)
          `)
          .eq('status', 'published')
          .or(`title_en.ilike.%${q}%,title_rw.ilike.%${q}%,description_en.ilike.%${q}%,description_rw.ilike.%${q}%`)
          .limit(10),
      ]);

      const podcastResults: SearchResult[] = (podRes.data || []).map((p: any) => ({
        type: 'podcast',
        id: p.id,
        title: (language === 'rw' ? p.title_rw : p.title_en) || p.title_en || 'Untitled',
        subtitle: p.speaker_name || '',
        cover_image_url: p.cover_image_url,
        href: `/podcasts/${p.slug || p.id}`,
      }));

      const episodeResults: SearchResult[] = (epRes.data || []).map((e: any) => ({
        type: 'episode',
        id: e.id,
        title: (language === 'rw' ? e.title_rw : e.title_en) || e.title_en || 'Untitled',
        subtitle: e.podcasts ? ((language === 'rw' ? e.podcasts.title_rw : e.podcasts.title_en) || e.podcasts.title_en || '') : '',
        cover_image_url: e.cover_image_url || e.podcasts?.cover_image_url,
        href: `/episodes/${e.id}`,
      }));

      setResults([...podcastResults, ...episodeResults]);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, performSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      saveRecentSearch(query.trim());
      performSearch(query);
    }
  };

  const podcastResults = results.filter((r) => r.type === 'podcast');
  const episodeResults = results.filter((r) => r.type === 'episode');

  return (
    <div className="container py-12 md:py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          {language === 'rw' ? 'Shakisha' : 'Search'}
        </h1>

        {/* Search Input */}
        <form onSubmit={handleSubmit} className="relative mb-6">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={language === 'rw' ? 'Shakisha podcast, gice, cyangwa uvugwa...' : 'Search podcasts, episodes, or speakers...'}
              className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setResults([]); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-white transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </form>

        {/* Recent Searches */}
        {!query && recentSearches.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-muted mb-3">
              {language === 'rw' ? 'Ibyo washakishe vuba' : 'Recent searches'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setQuery(s); performSearch(s); }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-sm text-white transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Results */}
        {!loading && query && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted">
              {language === 'rw' ? `Nta bisubizo byabonetse kuri "${query}"` : `No results found for "${query}"`}
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-8">
            {/* Podcast Results */}
            {podcastResults.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">
                  {language === 'rw' ? 'Podcast' : 'Podcasts'}
                  <span className="text-muted text-sm font-normal ml-2">({podcastResults.length})</span>
                </h2>
                <div className="space-y-2">
                  {podcastResults.map((r) => (
                    <Link
                      key={`pod-${r.id}`}
                      href={r.href}
                      className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition group"
                    >
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-black/40 ring-1 ring-white/10">
                        {r.cover_image_url && (
                          <Image src={r.cover_image_url} alt="" fill sizes="56px" className="object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate group-hover:text-primary transition">{r.title}</h3>
                        {r.subtitle && <p className="text-xs text-muted truncate">{r.subtitle}</p>}
                      </div>
                      <svg className="w-5 h-5 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Episode Results */}
            {episodeResults.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">
                  {language === 'rw' ? 'Amakuru' : 'Episodes'}
                  <span className="text-muted text-sm font-normal ml-2">({episodeResults.length})</span>
                </h2>
                <div className="space-y-2">
                  {episodeResults.map((r) => (
                    <Link
                      key={`ep-${r.id}`}
                      href={r.href}
                      className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition group"
                    >
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-black/40 ring-1 ring-white/10">
                        {r.cover_image_url && (
                          <Image src={r.cover_image_url} alt="" fill sizes="56px" className="object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate group-hover:text-primary transition">{r.title}</h3>
                        {r.subtitle && <p className="text-xs text-muted truncate">{r.subtitle}</p>}
                      </div>
                      <svg className="w-5 h-5 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
