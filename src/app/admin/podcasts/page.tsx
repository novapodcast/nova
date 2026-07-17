"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { selectAdminPodcasts } from '@/lib/data/podcasts';
import { useAdminGuard } from '@/lib/useAdminGuard';
import { uploadEpisodeCover } from '@/lib/upload';
import { useLanguage } from '@/contexts/LanguageContext';

const LANGUAGE_CONFIGS = [
  { code: 'en', label: 'English', titleKey: 'title_en', descriptionKey: 'description_en' },
  { code: 'rw', label: 'Kinyarwanda', titleKey: 'title_rw', descriptionKey: 'description_rw' },
] as const;

type LanguageCode = (typeof LANGUAGE_CONFIGS)[number]['code'];

type PodcastFormState = {
  title_en: string;
  title_rw: string;
  description_en: string;
  description_rw: string;
  cover_image_url: string;
  category_id: string;
  speaker_name: string;
  is_active: boolean;
  access_tier_id: string;
  slug: string;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
};

const INITIAL_FORM_STATE: PodcastFormState = {
  title_en: '',
  title_rw: '',
  description_en: '',
  description_rw: '',
  cover_image_url: '',
  category_id: '',
  speaker_name: '',
  is_active: true,
  access_tier_id: '',
  slug: '',
  status: 'published',
};

type Podcast = {
  id: string;
  title_en: string;
  title_rw: string;
  description_en: string | null;
  description_rw: string | null;
  cover_image_url: string;
  category_id: string | null;
  speaker_name: string;
  is_active: boolean;
  total_episodes: number;
  total_listeners: number;
  is_system: boolean;
  updated_at: string;
  created_at: string;
  access_tier_id: string | null;
  slug: string | null;
  status: string;
};

type EpisodeStats = {
  podcast_id: string;
  latest_episode_date: string | null;
  draft_count: number;
  published_count: number;
};

type Category = {
  id: string;
  slug: string;
  name_en: string;
  name_rw: string;
  color: string;
  sort_order: number;
};

export default function AdminPodcastsPage() {
  const { language } = useLanguage();
  const { loading: guardLoading, authorized } = useAdminGuard();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [episodeStats, setEpisodeStats] = useState<Map<string, EpisodeStats>>(new Map());
  const [pricingTiers, setPricingTiers] = useState<{id: string; plan_name: string; display_name_en: string; rank: number}[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [useCoverUrl, setUseCoverUrl] = useState(false);
  const [formData, setFormData] = useState<PodcastFormState>(INITIAL_FORM_STATE);
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>('en');

  const languageStatuses = useMemo(() => {
    return LANGUAGE_CONFIGS.map((config) => {
      const titleValue = formData[config.titleKey];
      const descriptionValue = formData[config.descriptionKey];
      return {
        ...config,
        hasTitle: Boolean(titleValue?.trim()),
        hasDescription: Boolean(descriptionValue?.trim()),
      };
    });
  }, [formData]);

  const activeLanguageConfig = useMemo(() => {
    return LANGUAGE_CONFIGS.find((config) => config.code === activeLanguage) ?? LANGUAGE_CONFIGS[0];
  }, [activeLanguage]);

  useEffect(() => {
    if (!editingId && showNewForm) {
      setActiveLanguage(language === 'rw' ? 'rw' : 'en');
    }
  }, [language, editingId, showNewForm]);

  useEffect(() => {
    if (!authorized) return;
    fetchPodcasts();
    fetchCategories();
    fetchPricingTiers();
    setLoading(false);
  }, [authorized]);

  useEffect(() => {
    if (!authorized) return;
    const shouldCreate = searchParams?.get('create');
    if (shouldCreate !== null) {
      startNew();
    }
  }, [authorized, searchParams]);

  async function fetchPodcasts() {
    const { data, error } = await selectAdminPodcasts(supabase)
      .order('created_at', { ascending: false });
    if (error) console.error('fetchPodcasts error:', error);
    if (!error && data) {
      const list = data as unknown as Podcast[];
      setPodcasts(list);
      if (list.length === 0) {
        startNew();
      }
      // Fetch episode stats for each podcast
      fetchEpisodeStats(list.map(p => p.id));
    }
  }

  async function fetchEpisodeStats(podcastIds: string[]) {
    if (podcastIds.length === 0) return;
    
    const { data, error } = await supabase
      .from('episodes')
      .select('podcast_id, published_at, is_active')
      .in('podcast_id', podcastIds);
    
    if (error) {
      console.error('fetchEpisodeStats error:', error);
      return;
    }

    const statsMap = new Map<string, EpisodeStats>();
    
    podcastIds.forEach(podcastId => {
      const podcastEpisodes = data?.filter(ep => ep.podcast_id === podcastId) || [];
      const publishedEpisodes = podcastEpisodes.filter(ep => ep.is_active && ep.published_at);
      const draftEpisodes = podcastEpisodes.filter(ep => !ep.is_active || !ep.published_at);
      
      const latestEpisode = publishedEpisodes
        .sort((a, b) => new Date(b.published_at!).getTime() - new Date(a.published_at!).getTime())[0];
      
      statsMap.set(podcastId, {
        podcast_id: podcastId,
        latest_episode_date: latestEpisode?.published_at || null,
        draft_count: draftEpisodes.length,
        published_count: publishedEpisodes.length,
      });
    });
    
    setEpisodeStats(statsMap);
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
    if (!error && data) setCategories(data);
  }

  function startEdit(p: Podcast) {
    if (p.is_system) {
      alert('System podcasts cannot be edited.');
      return;
    }
    setEditingId(p.id);
    setFormData({
      title_en: p.title_en,
      title_rw: p.title_rw,
      description_en: p.description_en || '',
      description_rw: p.description_rw || '',
      cover_image_url: p.cover_image_url,
      category_id: p.category_id || '',
      speaker_name: p.speaker_name,
      is_active: p.is_active,
      access_tier_id: p.access_tier_id || '',
      slug: p.slug || '',
      status: (p.status as 'draft' | 'scheduled' | 'published' | 'archived') || 'published',
    });
    const preferred = language === 'rw' ? 'rw' : 'en';
    const preferredTitle = p[`title_${preferred}` as const];
    if (preferredTitle?.trim()) {
      setActiveLanguage(preferred);
    } else if (p.title_en?.trim()) {
      setActiveLanguage('en');
    } else if (p.title_rw?.trim()) {
      setActiveLanguage('rw');
    } else {
      setActiveLanguage(preferred);
    }
    setShowNewForm(false);
  }

  function startNew() {
    setEditingId(null);
    setFormData(INITIAL_FORM_STATE);
    setActiveLanguage(language === 'rw' ? 'rw' : 'en');
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

  async function handleSave() {
    const incompleteLanguages = languageStatuses.filter((status) => !status.hasTitle);
    if (incompleteLanguages.length === LANGUAGE_CONFIGS.length) {
      alert('Add a title in English or Kinyarwanda to continue.');
      setActiveLanguage(incompleteLanguages[0]?.code ?? 'en');
      return;
    }
    if (incompleteLanguages.length > 0) {
      setActiveLanguage(incompleteLanguages[0].code);
    }
    if (!formData[activeLanguageConfig.titleKey]?.trim()) {
      const nextLanguageWithTitle = languageStatuses.find((lang) => lang.hasTitle);
      if (nextLanguageWithTitle) {
        setActiveLanguage(nextLanguageWithTitle.code);
      }
    }

    setSaving(true);
    try {

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        alert('Not authenticated');
        return;
      }

      const payload = {
        id: editingId,
        ...formData,
        title_en: formData.title_en || null,
        title_rw: formData.title_rw || null,
        description_en: formData.description_en || null,
        description_rw: formData.description_rw || null,
        cover_image_url: formData.cover_image_url || null,
        category_id: formData.category_id || null,
        speaker_name: formData.speaker_name || null,
        access_tier_id: formData.access_tier_id || null,
        slug: formData.slug || null,
        status: formData.status,
      };

      const res = await fetch('/api/admin/podcasts/save', {
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

      await fetchPodcasts();
      setEditingId(null);
      setShowNewForm(false);
      setActiveLanguage('en');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const target = podcasts.find((p) => p.id === id);
    if (target?.is_system) {
      alert('System podcasts cannot be deleted.');
      return;
    }
    if (!confirm('Delete this podcast and all its episodes?')) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        alert('Not authenticated');
        return;
      }

      const res = await fetch('/api/admin/podcasts/delete', {
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

      await fetchPodcasts();
    } finally {
      setSaving(false);
    }
  }

  if (guardLoading || !authorized || loading) {
    return (
      <div className="container py-12 md:py-16">
        <div className="text-muted">{guardLoading ? 'Checking access…' : 'Loading…'}</div>
      </div>
    );
  }

  const regularPodcasts = podcasts.filter((p) => !p.is_system);
  const systemPodcasts = podcasts.filter((p) => p.is_system);

  return (
    <div className="container py-12 md:py-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Podcast Shows</h1>
          <p className="text-muted">Manage your podcast series. Each show can contain multiple episodes.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/content"
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
          >
            Manage Episodes
          </Link>
          <button
            onClick={startNew}
            className="px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition font-semibold"
          >
            + New Podcast Show
          </button>
        </div>
      </div>

      {(editingId || showNewForm) && (
        <div className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 mb-8">
          <h2 className="text-xl font-semibold mb-2">
            {editingId ? 'Edit Podcast Show' : 'Create New Podcast Show'}
          </h2>
          <p className="text-sm text-muted mb-4">
            {editingId ? 'Update the details of this podcast series.' : 'Create a new podcast series. After creating the show, you can add episodes to it.'}
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Content Language</label>
              <div className="flex flex-wrap gap-2">
                {languageStatuses.map((lang) => {
                  const isActive = activeLanguage === lang.code;
                  const hasTitle = lang.hasTitle;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setActiveLanguage(lang.code)}
                      className={`group flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                        isActive ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(34,197,94,0.45)]' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span>{lang.label}</span>
                      <span className={`text-xs font-medium ${hasTitle ? 'text-emerald-700 group-[.bg-primary]:text-emerald-800' : 'text-amber-400'}`}>
                        {hasTitle ? '✓' : '⚠'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 rounded-lg border border-white/10 bg-black/25 p-3 text-xs text-muted">
                <p className="mb-1 font-semibold text-white/80">Translation progress</p>
                <div className="space-y-1">
                  {languageStatuses.map((lang) => {
                    const statusText = lang.hasTitle
                      ? (lang.hasDescription ? 'Complete' : 'Title ready · description optional')
                      : 'Title missing';
                    return (
                      <div key={lang.code} className="flex items-center gap-2">
                        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${lang.hasTitle ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                        <span className="font-medium text-white/70">{lang.label}</span>
                        <span className={lang.hasTitle ? 'text-emerald-300' : 'text-amber-300'}>{statusText}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData[activeLanguageConfig.titleKey]}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      [activeLanguageConfig.titleKey]: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={`Enter the ${activeLanguageConfig.label.toLowerCase()} title`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData[activeLanguageConfig.descriptionKey]}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      [activeLanguageConfig.descriptionKey]: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={`Describe the show in ${activeLanguageConfig.label}`}
                />
                <p className="mt-1 text-xs text-muted">Descriptions help listeners understand the show. Title is required; description is optional.</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Speaker Name</label>
                <input
                  type="text"
                  value={formData.speaker_name}
                  onChange={(e) => setFormData({ ...formData, speaker_name: e.target.value })}
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name_rw} · {cat.name_en}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Cover Image</label>
                <button
                  type="button"
                  onClick={() => setUseCoverUrl(!useCoverUrl)}
                  className="text-xs text-primary hover:underline"
                >
                  {useCoverUrl ? '📁 Upload File' : '🔗 Use URL'}
                </button>
              </div>
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
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Access Plan <span className="text-red-400">*</span></label>
                <select
                  value={formData.access_tier_id}
                  onChange={(e) => setFormData({ ...formData, access_tier_id: e.target.value })}
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg"
                >
                  <option value="">Select plan</option>
                  {pricingTiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.display_name_en} (Rank {tier.rank})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted mt-1">Sets the minimum subscription required to play episodes.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Publishing Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'scheduled' | 'published' | 'archived' })}
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg"
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">URL Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="auto-generated if empty"
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted mt-1">SEO-friendly URL: /podcasts/your-slug</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="is_active" className="text-sm font-medium">Active</label>
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
        {regularPodcasts.map((p) => {
          const stats = episodeStats.get(p.id);
          const formatTimeAgo = (dateStr: string | null) => {
            if (!dateStr) return null;
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return language === 'rw' ? 'Uyu munsi' : 'Today';
            if (diffDays === 1) return language === 'rw' ? 'Ejo' : 'Yesterday';
            if (diffDays < 7) return language === 'rw' ? `Hashize iminsi ${diffDays}` : `${diffDays} days ago`;
            if (diffDays < 30) {
              const weeks = Math.floor(diffDays / 7);
              return language === 'rw' ? `Hashize icyumweru ${weeks}` : `${weeks} week${weeks > 1 ? 's' : ''} ago`;
            }
            if (diffDays < 365) {
              const months = Math.floor(diffDays / 30);
              return language === 'rw' ? `Hashize ukwezi ${months}` : `${months} month${months > 1 ? 's' : ''} ago`;
            }
            const years = Math.floor(diffDays / 365);
            return language === 'rw' ? `Hashize umwaka ${years}` : `${years} year${years > 1 ? 's' : ''} ago`;
          };

          return (
            <div key={p.id} className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5">
              <div className="flex items-start gap-6">
                {/* Podcast Cover */}
                {p.cover_image_url && (
                  <img src={p.cover_image_url} alt="" className="w-24 h-24 rounded-xl object-cover flex-shrink-0 ring-1 ring-white/10" />
                )}
                
                {/* Main Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold mb-1">
                    {language === 'rw' ? p.title_rw : p.title_en}
                  </h3>
                  {p.speaker_name && (
                    <p className="text-sm text-primary font-medium mb-3">{p.speaker_name}</p>
                  )}
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-2xl font-bold text-white">{p.total_episodes}</div>
                      <div className="text-xs text-muted">{language === 'rw' ? 'Ibice' : 'Episodes'}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{p.total_listeners.toLocaleString()}</div>
                      <div className="text-xs text-muted">{language === 'rw' ? 'Abumva' : 'Plays'}</div>
                    </div>
                    {stats?.latest_episode_date && (
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {new Date(stats.latest_episode_date).toLocaleDateString(language === 'rw' ? 'en-GB' : 'en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-xs text-muted">{language === 'rw' ? 'Igice cya nyuma' : 'Last episode'}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {formatTimeAgo(p.updated_at) || 'Recently'}
                      </div>
                      <div className="text-xs text-muted">{language === 'rw' ? 'Byavuguruwe' : 'Last updated'}</div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${p.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {p.is_active ? (language === 'rw' ? 'Irakora' : 'Active') : (language === 'rw' ? 'Ntiyakora' : 'Inactive')}
                    </span>
                    {p.status && p.status !== 'published' && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        p.status === 'draft' ? 'bg-amber-500/20 text-amber-400' :
                        p.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </span>
                    )}
                    {pricingTiers.find(t => t.id === p.access_tier_id) && (
                      <span className="px-2 py-1 text-xs rounded-full bg-primary/20 text-primary font-medium">
                        {pricingTiers.find(t => t.id === p.access_tier_id)?.display_name_en}
                      </span>
                    )}
                    {stats && stats.draft_count > 0 && (
                      <span className="px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-400">
                        {stats.draft_count} {language === 'rw' ? 'draft' : 'draft'}{stats.draft_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Link
                    href={`/admin/content?podcast=${p.id}`}
                    className="px-4 py-2 text-sm bg-primary text-black font-semibold rounded-lg hover:bg-primary/90 transition text-center whitespace-nowrap"
                  >
                    {language === 'rw' ? 'Gucunga Ibice' : 'Manage Episodes'}
                  </Link>
                  <button
                    onClick={() => startEdit(p)}
                    className="px-4 py-2 text-sm bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
                  >
                    {language === 'rw' ? 'Hindura' : 'Edit Podcast'}
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={saving}
                    className="px-4 py-2 text-sm bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition disabled:opacity-50"
                  >
                    {language === 'rw' ? 'Siba' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {regularPodcasts.length === 0 && !showNewForm && (
        <div className="text-center py-12 bg-[var(--surface)] rounded-xl ring-1 ring-white/5">
          <div className="text-4xl mb-4">🎙️</div>
          <h3 className="text-lg font-semibold mb-2">No Podcast Shows Yet</h3>
          <p className="text-muted mb-6 max-w-md mx-auto">
            Create your first podcast show (like &quot;Sunday Sermons&quot; or &quot;Learn Kinyarwanda&quot;), then add episodes to it.
          </p>
          <button
            onClick={startNew}
            className="px-6 py-3 bg-primary text-black rounded-lg hover:bg-primary/90 transition font-semibold"
          >
            + Create Your First Podcast Show
          </button>
        </div>
      )}

      {systemPodcasts.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span>System Podcasts</span>
            <span className="px-2 py-1 text-xs rounded-full bg-white/10 text-white/70">Protected</span>
          </h2>
          <p className="text-sm text-muted mb-4">
            These records are created automatically to maintain data integrity and cannot be edited or deleted.
          </p>
          <div className="space-y-3">
            {systemPodcasts.map((p) => (
              <div key={p.id} className="bg-black/30 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{language === 'rw' ? p.title_rw : p.title_en}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70 uppercase tracking-wide">System</span>
                  </div>
                  <p className="text-sm text-muted mt-1 max-w-xl">
                    {(language === 'rw' ? p.description_rw : p.description_en) || 'Automatically generated system podcast.'}
                  </p>
                </div>
                <div className="text-xs text-muted flex flex-col items-end">
                  <span>{p.total_episodes} episode{p.total_episodes !== 1 ? 's' : ''}</span>
                  <span>{p.speaker_name || 'System generated'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
