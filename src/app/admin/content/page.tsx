"use client";
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { selectPodcasts } from '@/lib/data/podcasts';
import { useAdminGuard } from '@/lib/useAdminGuard';
import { uploadEpisodeCover, uploadEpisodeAudio, getAudioDuration } from '@/lib/upload';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';

type Podcast = {
  id: string;
  title_en: string;
  title_rw: string;
  description_en: string | null;
  description_rw: string | null;
  cover_image_url: string;
  speaker_name: string;
  is_active: boolean;
  total_episodes: number;
  total_listeners: number;
  is_system: boolean;
};

type Episode = {
  id: string;
  title_en: string | null;
  title_rw: string | null;
  description_en: string | null;
  description_rw: string | null;
  audio_url: string | null;
  cover_image_url: string | null;
  duration_seconds: number | null;
  published_at: string | null;
  is_premium: boolean;
  access_tier_id: string | null;
  language: 'en' | 'rw';
  podcast_id: string | null;
  status: string;
  created_at: string;
  categories: string[];
};

type Category = {
  id: string;
  slug: string;
  name_en: string;
  name_rw: string;
  color: string;
  sort_order: number;
};

export default function AdminContentPage() {
  const { language } = useLanguage();
  const { loading: guardLoading, authorized } = useAdminGuard();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [selectedPodcastId, setSelectedPodcastId] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [predefinedCategories, setPredefinedCategories] = useState<Category[]>([]);
  const [pricingTiers, setPricingTiers] = useState<{id: string; plan_name: string; display_name_en: string; rank: number}[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title_en: '',
    title_rw: '',
    description_en: '',
    description_rw: '',
    slug: '',
    status: 'draft',
    scheduled_at: '' as string | '',
    meta_title_en: '',
    meta_title_rw: '',
    meta_description_en: '',
    meta_description_rw: '',
    og_image_url: '',
    audio_url: '',
    cover_image_url: '',
    duration_seconds: 0,
    is_premium: false,
    access_tier_id: '' as string,
    language: 'rw' as 'en' | 'rw',
    categories: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [useCoverUrl, setUseCoverUrl] = useState(false);
  const [useAudioUrl, setUseAudioUrl] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEpisodeIds, setSelectedEpisodeIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');

  useEffect(() => {
    if (authorized) {
      fetchPodcasts().then(() => {
        const podcastParam = searchParams?.get('podcast');
        if (podcastParam) setSelectedPodcastId(podcastParam);
      });
      fetchCategories();
      fetchPricingTiers();
      setLoading(false);
    }
  }, [authorized, searchParams]);

  useEffect(() => {
    if (selectedPodcastId) {
      fetchEpisodes(selectedPodcastId);
    } else {
      setEpisodes([]);
    }
  }, [selectedPodcastId]);

  async function fetchPodcasts() {
    const { data, error } = await selectPodcasts(supabase, { includeSystem: false, includeInactive: true })
      .order('created_at', { ascending: false });
    if (error) console.error('fetchPodcasts error:', error);
    if (!error && data) setPodcasts(data as unknown as Podcast[]);
  }

  async function fetchEpisodes(podcastId: string) {
    const { data, error } = await supabase
      .from('episodes')
      .select('*')
      .eq('podcast_id', podcastId)
      .order('created_at', { ascending: false });
    if (error) console.error('fetchEpisodes error:', error);
    if (!error && data) setEpisodes(data as Episode[]);
  }

  async function fetchPricingTiers() {
    const { data, error } = await supabase
      .from('pricing_tiers')
      .select('id, plan_name, display_name_en, rank')
      .eq('is_active', true)
      .order('rank', { ascending: true });
    if (!error && data) setPricingTiers(data);
  }

  async function fetchCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (!error && data) {
      setPredefinedCategories(data);
    }
  }

  const selectedPodcast = podcasts.find((p) => p.id === selectedPodcastId);

  function startEdit(ep: Episode) {
    setEditingId(ep.id);
    setFormData({
      title_en: ep.title_en || '',
      title_rw: ep.title_rw || '',
      description_en: ep.description_en || '',
      description_rw: ep.description_rw || '',
      slug: (ep as any).slug || '',
      status: ep.status || (ep.published_at ? 'published' : 'draft'),
      scheduled_at: (ep as any).scheduled_at || '',
      meta_title_en: (ep as any).meta_title_en || '',
      meta_title_rw: (ep as any).meta_title_rw || '',
      meta_description_en: (ep as any).meta_description_en || '',
      meta_description_rw: (ep as any).meta_description_rw || '',
      og_image_url: (ep as any).og_image_url || '',
      audio_url: ep.audio_url || '',
      cover_image_url: ep.cover_image_url || '',
      duration_seconds: ep.duration_seconds ?? 0,
      is_premium: ep.is_premium,
      access_tier_id: ep.access_tier_id || '',
      language: ep.language || 'rw',
      categories: ep.categories || [],
    });
    setShowNewForm(false);
  }

  function startNew() {
    setEditingId(null);
    setFormData({
      title_en: '',
      title_rw: '',
      description_en: '',
      description_rw: '',
      slug: '',
      status: 'draft',
      scheduled_at: '',
      meta_title_en: '',
      meta_title_rw: '',
      meta_description_en: '',
      meta_description_rw: '',
      og_image_url: '',
      audio_url: '',
      cover_image_url: '',
      duration_seconds: 0,
      is_premium: false,
      access_tier_id: '',
      language: 'rw',
      categories: [],
    });
    setShowNewForm(true);
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Cover image too large. Max 10MB.');
      return;
    }

    setUploadingCover(true);
    try {
      const { url } = await uploadEpisodeCover(file);
      setFormData({ ...formData, cover_image_url: url });
    } catch (error: any) {
      alert(error.message || 'Upload failed');
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024 * 1024) {
      alert('Audio file too large. Max 500MB.');
      return;
    }

    setUploadingAudio(true);
    try {
      const duration = await getAudioDuration(file);
      const { url } = await uploadEpisodeAudio(file);
      setFormData({ ...formData, audio_url: url, duration_seconds: duration });
    } catch (error: any) {
      alert(error.message || 'Upload failed');
    } finally {
      setUploadingAudio(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        alert('Not authenticated');
        return;
      }

      if (!selectedPodcastId) {
        alert('No podcast selected');
        return;
      }

      const payload = {
        id: editingId,
        ...formData,
        podcast_id: selectedPodcastId,
        scheduled_at: (formData.status === 'scheduled' && formData.scheduled_at) ? formData.scheduled_at : null,
        title_en: formData.title_en || null,
        title_rw: formData.title_rw || null,
        description_en: formData.description_en || null,
        description_rw: formData.description_rw || null,
        slug: formData.slug || null,
        meta_title_en: formData.meta_title_en || null,
        meta_title_rw: formData.meta_title_rw || null,
        meta_description_en: formData.meta_description_en || null,
        meta_description_rw: formData.meta_description_rw || null,
        og_image_url: formData.og_image_url || null,
        audio_url: formData.audio_url || null,
        cover_image_url: formData.cover_image_url || null,
        duration_seconds: formData.duration_seconds || null,
      };

      const res = await fetch('/api/admin/content/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to save');
        return;
      }

      if (selectedPodcastId) await fetchEpisodes(selectedPodcastId);
      setEditingId(null);
      setShowNewForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this episode?')) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        alert('Not authenticated');
        return;
      }

      const res = await fetch('/api/admin/content/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to delete');
        return;
      }

      if (selectedPodcastId) await fetchEpisodes(selectedPodcastId);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(id: string) {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        alert('Not authenticated');
        return;
      }

      const res = await fetch('/api/admin/content/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to publish');
        return;
      }

      if (selectedPodcastId) await fetchEpisodes(selectedPodcastId);
    } finally {
      setSaving(false);
    }
  }

  if (guardLoading || !authorized || loading) {
    return (
      <div className="container py-12 md:py-16">
        <div className="text-muted">{guardLoading ? 'Checking access…' : 'Loading content…'}</div>
      </div>
    );
  }

  const filteredEpisodes = episodes.filter((ep) => {
    const t1 = (ep.title_en || '').toLowerCase();
    const t2 = (ep.title_rw || '').toLowerCase();
    const d1 = (ep.description_en || '').toLowerCase();
    const d2 = (ep.description_rw || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = t1.includes(q) || t2.includes(q) || d1.includes(q) || d2.includes(q);
    const matchesStatus = statusFilter === 'all' || ep.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleEpisodeSelection = (id: string) => {
    setSelectedEpisodeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedEpisodeIds.size === filteredEpisodes.length) {
      setSelectedEpisodeIds(new Set());
    } else {
      setSelectedEpisodeIds(new Set(filteredEpisodes.map(ep => ep.id)));
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedEpisodeIds.size === 0) return;
    const ids = Array.from(selectedEpisodeIds);
    const actionLabel = bulkAction === 'publish' ? 'publish' : bulkAction === 'archive' ? 'archive' : bulkAction === 'delete' ? 'delete' : '';
    if (!confirm(`Are you sure you want to ${actionLabel} ${ids.length} episode(s)?`)) return;

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { alert('Not authenticated'); return; }

      if (bulkAction === 'delete') {
        for (const id of ids) {
          await fetch('/api/admin/content/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ id }),
          });
        }
      } else {
        for (const id of ids) {
          await fetch('/api/admin/content/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ id, status: bulkAction, podcast_id: selectedPodcastId }),
          });
        }
      }

      if (selectedPodcastId) await fetchEpisodes(selectedPodcastId);
      setSelectedEpisodeIds(new Set());
      setBulkAction('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-12 md:py-16">
      {/* Breadcrumb Navigation */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted">
        <Link href="/admin/dashboard" className="hover:text-primary transition">Dashboard</Link>
        <span>›</span>
        <Link href="/admin/podcasts" className="hover:text-primary transition">Podcasts</Link>
        {selectedPodcast && (
          <>
            <span>›</span>
            <span className="text-white">{language === 'rw' ? selectedPodcast.title_rw : selectedPodcast.title_en}</span>
          </>
        )}
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {selectedPodcast ? 'Manage Episodes' : 'Episode Management'}
          </h1>
          <p className="text-muted">
            {selectedPodcast 
              ? `Add and manage episodes for "${language === 'rw' ? selectedPodcast.title_rw : selectedPodcast.title_en}"`
              : 'Select a podcast show to manage its episodes'
            }
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/podcasts"
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
          >
            ← Back to Podcasts
          </Link>
          {selectedPodcastId && (
            <button
              onClick={startNew}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              + New Episode
            </button>
          )}
        </div>
      </div>

      {/* Podcast Selector */}
      {!selectedPodcastId && (
        <div className="mb-8 bg-[var(--surface)] rounded-xl p-8 ring-1 ring-white/5 text-center">
          <h2 className="text-xl font-semibold mb-3">Select a Podcast</h2>
          <p className="text-muted mb-6">Choose which podcast you'd like to manage episodes for</p>
          
          {podcasts.length === 0 ? (
            <div className="py-8">
              <div className="text-4xl mb-4">🎙️</div>
              <p className="text-lg font-semibold mb-2">No Podcast Shows Yet</p>
              <p className="text-muted mb-6 max-w-md mx-auto">
                Before you can add episodes, you need to create a podcast show (like "Sunday Sermons" or "Learn Kinyarwanda").
              </p>
              <Link
                href="/admin/podcasts?create"
                className="inline-block px-6 py-3 bg-primary text-black font-semibold rounded-lg hover:bg-primary/90 transition"
              >
                + Create Your First Podcast Show
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {podcasts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedPodcastId(p.id); setEditingId(null); setShowNewForm(false); }}
                  className="p-4 rounded-xl text-left transition ring-1 bg-black/20 ring-white/10 hover:ring-primary/50 hover:bg-primary/5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {p.cover_image_url && (
                      <img src={p.cover_image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {language === 'rw' ? p.title_rw : p.title_en}
                      </div>
                      <div className="text-xs text-muted">
                        {p.speaker_name}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted">
                    {p.total_episodes} episode{p.total_episodes !== 1 ? 's' : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedPodcast && (
        <div className="mb-6 p-6 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 ring-1 ring-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {selectedPodcast.cover_image_url && (
                <img src={selectedPodcast.cover_image_url} alt="" className="w-20 h-20 rounded-lg object-cover ring-2 ring-primary/30" />
              )}
              <div>
                <div className="text-xs text-primary font-semibold mb-1 uppercase tracking-wide">Podcast Show</div>
                <h2 className="text-2xl font-bold mb-1">
                  {language === 'rw' ? selectedPodcast.title_rw : selectedPodcast.title_en}
                </h2>
                <p className="text-sm text-muted max-w-2xl">
                  {language === 'rw' ? selectedPodcast.description_rw : selectedPodcast.description_en || 'No description'}
                </p>
                <div className="flex gap-4 mt-2 text-xs text-muted">
                  <span>🎙️ Host: {selectedPodcast.speaker_name}</span>
                  <span>📊 {selectedPodcast.total_episodes} episode{selectedPodcast.total_episodes !== 1 ? 's' : ''} in this show</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => { setSelectedPodcastId(null); setEditingId(null); setShowNewForm(false); }}
              className="px-4 py-2 text-sm bg-white/10 rounded-lg hover:bg-white/20 transition"
            >
              Change Podcast
            </button>
          </div>
        </div>
      )}

      {selectedPodcastId && (
        <div className="mb-6 space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="🔍 Search episodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:border-primary outline-none transition"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {selectedEpisodeIds.size > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-sm text-primary font-medium">
                {selectedEpisodeIds.size} selected
              </span>
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-white text-sm"
              >
                <option value="">Choose action…</option>
                <option value="publish">Publish</option>
                <option value="archive">Archive</option>
                <option value="delete">Delete</option>
              </select>
              {bulkAction && (
                <button
                  onClick={handleBulkAction}
                  disabled={saving}
                  className="px-4 py-1.5 bg-primary text-black text-sm font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50"
                >
                  Apply
                </button>
              )}
              <button
                onClick={() => { setSelectedEpisodeIds(new Set()); setBulkAction(''); }}
                className="text-sm text-muted hover:text-white transition ml-auto"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {(editingId || showNewForm) && selectedPodcastId && (
        <div className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Episode' : 'New Episode'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Episode Language</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, language: 'en' })}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${formData.language === 'en' ? 'bg-primary text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, language: 'rw' })}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${formData.language === 'rw' ? 'bg-primary text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  Kinyarwanda
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Title ({formData.language === 'en' ? 'EN' : 'RW'})
              </label>
              <input
                type="text"
                value={formData.language === 'en' ? formData.title_en : formData.title_rw}
                onChange={(e) => setFormData({
                  ...formData,
                  [formData.language === 'en' ? 'title_en' : 'title_rw']: e.target.value,
                })}
                className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Description ({formData.language === 'en' ? 'EN' : 'RW'})
              </label>
              <textarea
                value={formData.language === 'en' ? formData.description_en : formData.description_rw}
                onChange={(e) => setFormData({
                  ...formData,
                  [formData.language === 'en' ? 'description_en' : 'description_rw']: e.target.value,
                })}
                rows={3}
                className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="auto-generated if empty"
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    const base = formData.language === 'en' ? formData.title_en : formData.title_rw;
                    const slug = (base || '')
                      .toLowerCase()
                      .normalize('NFD').replace(/\p{Diacritic}/gu, '')
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, '');
                    setFormData({ ...formData, slug });
                  }}
                  className="px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20"
                >
                  Generate
                </button>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg"
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              {formData.status === 'scheduled' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Scheduled At</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_at ? new Date(formData.scheduled_at).toISOString().slice(0,16) : ''}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: new Date(e.target.value).toISOString() })}
                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg"
                  />
                </div>
              )}
            </div>
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-sm font-semibold mb-3">SEO</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm mb-1">Meta Title ({formData.language === 'en' ? 'EN' : 'RW'})</label>
                  <input
                    value={formData.language === 'en' ? formData.meta_title_en : formData.meta_title_rw}
                    onChange={(e) => setFormData({
                      ...formData,
                      [formData.language === 'en' ? 'meta_title_en' : 'meta_title_rw']: e.target.value,
                    })}
                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Meta Description ({formData.language === 'en' ? 'EN' : 'RW'})</label>
                  <textarea
                    value={formData.language === 'en' ? formData.meta_description_en : formData.meta_description_rw}
                    onChange={(e) => setFormData({
                      ...formData,
                      [formData.language === 'en' ? 'meta_description_en' : 'meta_description_rw']: e.target.value,
                    })}
                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">OG Image URL</label>
                  <input value={formData.og_image_url} onChange={(e)=>setFormData({ ...formData, og_image_url: e.target.value })} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg"/>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Categories</label>
              
              {/* Selected Categories */}
              {formData.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 p-3 bg-black/20 rounded-lg border border-white/10">
                  {formData.categories.map((cat, idx) => {
                    const predefined = predefinedCategories.find(c => c.name_rw === cat || c.name_en === cat);
                    const color = predefined?.color || '#666';
                    return (
                      <span
                        key={idx}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2"
                        style={{
                          backgroundColor: `${color}20`,
                          color: color,
                          border: `1px solid ${color}40`,
                        }}
                      >
                        {cat}
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, categories: formData.categories.filter((c) => c !== cat) })}
                          className="hover:opacity-70 font-bold"
                        >×</button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Predefined Categories */}
              <div className="mb-3">
                <p className="text-xs text-muted mb-2">📌 Predefined Categories (click to add):</p>
                <div className="flex flex-wrap gap-2">
                  {predefinedCategories.map((cat) => {
                    const isSelected = formData.categories.includes(cat.name_rw);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          if (!isSelected) {
                            setFormData({ ...formData, categories: [...formData.categories, cat.name_rw] });
                          }
                        }}
                        disabled={isSelected}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: isSelected ? `${cat.color}40` : `${cat.color}20`,
                          color: cat.color,
                          border: `1px solid ${cat.color}${isSelected ? '60' : '40'}`,
                        }}
                      >
                        {cat.name_rw} · {cat.name_en}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Category Input */}
              <div>
                <p className="text-xs text-muted mb-2">✏️ Add Custom Category:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    placeholder="e.g., Business, Technology..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const v = customCategoryInput.trim();
                        if (v && !formData.categories.includes(v)) {
                          setFormData({ ...formData, categories: [...formData.categories, v] });
                          setCustomCategoryInput('');
                        }
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = customCategoryInput.trim();
                      if (v && !formData.categories.includes(v)) {
                        setFormData({ ...formData, categories: [...formData.categories, v] });
                        setCustomCategoryInput('');
                      }
                    }}
                    className="px-4 py-2 bg-primary/20 border border-primary/40 text-primary rounded-lg hover:bg-primary/30 transition text-sm font-semibold"
                  >
                    Add
                  </button>
                </div>
                <p className="text-xs text-muted mt-1">💡 Tip: Use predefined categories for consistency, or add custom ones as needed.</p>
              </div>
            </div>

            {/* Audio Upload - Primary Section */}
            <div className="border-t border-white/10 pt-6">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      🎵 Episode Audio
                      <span className="text-xs font-normal text-red-400">*Required</span>
                    </h3>
                    <p className="text-xs text-muted mt-1">Upload the main audio file for this episode</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseAudioUrl(!useAudioUrl)}
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    {useAudioUrl ? '📁 Upload File Instead' : '🔗 Use URL Instead'}
                  </button>
                </div>
                
                {useAudioUrl ? (
                  <div>
                    <input
                      type="text"
                      value={formData.audio_url}
                      onChange={(e) => setFormData({ ...formData, audio_url: e.target.value })}
                      placeholder="https://example.com/audio.mp3"
                      className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {formData.audio_url && (
                      <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-sm text-green-400">✓ Audio URL set</p>
                        <audio src={formData.audio_url} controls className="w-full mt-2" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/aac,audio/m4a"
                      onChange={handleAudioUpload}
                      disabled={uploadingAudio}
                      className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg file:mr-4 file:py-2.5 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-black hover:file:opacity-90 disabled:opacity-50 cursor-pointer"
                    />
                    {uploadingAudio && (
                      <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                        <p className="text-sm text-primary">⏳ Uploading audio... Please wait.</p>
                      </div>
                    )}
                    {!uploadingAudio && formData.audio_url && (
                      <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-sm text-green-400 mb-2">✓ Audio uploaded successfully ({formData.duration_seconds}s)</p>
                        <audio src={formData.audio_url} controls className="w-full" />
                      </div>
                    )}
                    <p className="text-xs text-muted mt-2">📦 Max 500MB • Formats: MP3, WAV, OGG, AAC, M4A</p>
                  </div>
                )}
                
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/10">
                  <label className="text-sm font-medium">Duration (seconds):</label>
                  <input
                    type="number"
                    value={formData.duration_seconds}
                    onChange={(e) => setFormData({ ...formData, duration_seconds: parseInt(e.target.value) || 0 })}
                    className="w-32 px-3 py-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-xs text-muted">Auto-detected on upload</span>
                </div>
              </div>
            </div>

            {/* Cover Image - Optional */}
            <div className="border-t border-white/10 pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Episode Cover Image <span className="text-xs text-muted">(Optional)</span></label>
                <button
                  type="button"
                  onClick={() => setUseCoverUrl(!useCoverUrl)}
                  className="text-xs text-primary hover:underline"
                >
                  {useCoverUrl ? '📁 Upload File' : '🔗 Use URL'}
                </button>
              </div>
              <p className="text-xs text-muted mb-3">Leave empty to use the podcast's cover image</p>
              {useCoverUrl ? (
                <input
                  type="text"
                  value={formData.cover_image_url}
                  onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                  placeholder="https://example.com/cover.jpg"
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              ) : (
                <div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleCoverUpload}
                    disabled={uploadingCover}
                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-black hover:file:opacity-90 disabled:opacity-50"
                  />
                  {uploadingCover && <p className="text-xs text-primary mt-1">Uploading cover...</p>}
                  {formData.cover_image_url && (
                    <img src={formData.cover_image_url} alt="Cover preview" className="mt-2 w-32 h-32 object-cover rounded-lg border border-white/10" />
                  )}
                  <p className="text-xs text-muted mt-1">Max 10MB. JPG, PNG, WebP.</p>
                </div>
              )}
            </div>
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-sm font-semibold mb-3">Access Plan</h3>
              <div className="flex items-center gap-3">
                <select
                  value={formData.access_tier_id}
                  onChange={(e) => setFormData({ ...formData, access_tier_id: e.target.value })}
                  className="flex-1 px-3 py-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Inherit from Podcast</option>
                  {pricingTiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.display_name_en} (Rank {tier.rank})
                    </option>
                  ))}
                </select>
                {formData.access_tier_id === '' && (
                  <span className="text-xs text-muted whitespace-nowrap">
                    Episodes inherit the podcast's access plan by default.
                  </span>
                )}
                {formData.access_tier_id !== '' && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, access_tier_id: '' })}
                    className="text-xs text-primary hover:underline whitespace-nowrap"
                  >
                    Reset to inherit
                  </button>
                )}
              </div>
              <p className="text-xs text-muted mt-2">
                Override the podcast's access plan for this specific episode only. Leave as "Inherit" to use the podcast's plan.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setEditingId(null); setShowNewForm(false); }}
                className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {filteredEpisodes.length > 0 && (
          <div className="flex items-center gap-3 px-2">
            <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={selectedEpisodeIds.size === filteredEpisodes.length && filteredEpisodes.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded"
              />
              Select All
            </label>
            <span className="text-xs text-muted">
              {filteredEpisodes.length} episode{filteredEpisodes.length !== 1 ? 's' : ''}
              {statusFilter !== 'all' && ` (${statusFilter})`}
            </span>
          </div>
        )}
        {filteredEpisodes.map((ep) => (
          <div key={ep.id} className={`bg-[var(--surface)] rounded-xl p-6 ring-1 transition ${selectedEpisodeIds.has(ep.id) ? 'ring-primary/30 bg-primary/5' : 'ring-white/5'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={selectedEpisodeIds.has(ep.id)}
                  onChange={() => toggleEpisodeSelection(ep.id)}
                  className="w-4 h-4 rounded mt-1.5 flex-shrink-0"
                />
                <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-xs font-bold rounded ${ep.language === 'en' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                    {ep.language === 'en' ? 'EN' : 'RW'}
                  </span>
                  <h3 className="text-lg font-semibold">
                    {ep.title_en || ep.title_rw || 'Untitled'}
                  </h3>
                </div>
                <p className="text-sm text-muted mb-2">
                  {ep.description_en || ep.description_rw || 'No description'}
                </p>
                <div className="flex gap-4 text-xs text-muted flex-wrap">
                  <span>{ep.audio_url ? `${ep.duration_seconds ?? 0}s` : 'No audio'}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    ep.status === 'published' ? 'bg-green-500/20 text-green-400' :
                    ep.status === 'draft' ? 'bg-amber-500/20 text-amber-400' :
                    ep.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {ep.status ? ep.status.charAt(0).toUpperCase() + ep.status.slice(1) : 'Draft'}
                  </span>
                  {ep.access_tier_id && pricingTiers.find(t => t.id === ep.access_tier_id) ? (
                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                      {pricingTiers.find(t => t.id === ep.access_tier_id)?.display_name_en}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-muted text-xs">
                      Inherits podcast plan
                    </span>
                  )}
                  {ep.published_at && (
                    <span>Published {new Date(ep.published_at).toLocaleDateString()}</span>
                  )}
                </div>
                </div>
              </div>
              <div className="flex gap-2">
                {!ep.published_at && (
                  <button
                    onClick={() => handlePublish(ep.id)}
                    disabled={saving}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50"
                  >
                    Publish
                  </button>
                )}
                <button
                  onClick={() => startEdit(ep)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(ep.id)}
                  disabled={saving}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredEpisodes.length === 0 && episodes.length > 0 && (
        <div className="text-center py-12 text-muted">
          No episodes match your search.
        </div>
      )}

      {episodes.length === 0 && (
        <div className="text-center py-12 text-muted">
          No episodes yet. Click "New Episode" to get started.
        </div>
      )}
    </div>
  );
}
