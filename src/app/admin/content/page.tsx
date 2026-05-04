"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { isAdminEmail } from '@/lib/admin';
import { uploadEpisodeCover, uploadEpisodeAudio, getAudioDuration, formatFileSize } from '@/lib/upload';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';

type Episode = {
  id: string;
  title: string;
  description: string | null;
  audio_url: string | null;
  cover_image_url: string | null;
  duration_seconds: number | null;
  published_at: string | null;
  is_premium: boolean;
  created_at: string;
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
  const router = useRouter();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [predefinedCategories, setPredefinedCategories] = useState<Category[]>([]);
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
    categories: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [useAudioUrl, setUseAudioUrl] = useState(false);
  const [useCoverUrl, setUseCoverUrl] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      const email = data.user?.email ?? null;
      if (!email) {
        router.replace('/login');
        return;
      }

      const userId = data.user?.id;
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();

      const isAdmin = profile?.is_admin || isAdminEmail(email);
      if (!isAdmin) {
        router.replace('/dashboard');
        return;
      }

      fetchEpisodes();
      fetchCategories();
      setLoading(false);
    });
    return () => { active = false; };
  }, [router]);

  async function fetchEpisodes() {
    const { data, error } = await supabase
      .from('episodes')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setEpisodes(data);
    }
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

  function startEdit(ep: Episode) {
    setEditingId(ep.id);
    setFormData({
      title_en: (ep as any).title_en || (ep as any).title || '',
      title_rw: (ep as any).title_rw || '',
      description_en: (ep as any).description_en || (ep as any).description || '',
      description_rw: (ep as any).description_rw || '',
      slug: (ep as any).slug || '',
      status: (ep as any).status || ((ep as any).published_at ? 'published' : 'draft'),
      scheduled_at: (ep as any).scheduled_at || '',
      meta_title_en: (ep as any).meta_title_en || '',
      meta_title_rw: (ep as any).meta_title_rw || '',
      meta_description_en: (ep as any).meta_description_en || '',
      meta_description_rw: (ep as any).meta_description_rw || '',
      og_image_url: (ep as any).og_image_url || '',
      audio_url: ep.audio_url || '',
      cover_image_url: ep.cover_image_url || '',
      duration_seconds: ep.duration_seconds || 0,
      is_premium: ep.is_premium,
      categories: (ep as any).categories || [],
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

      const payload = {
        id: editingId,
        ...formData,
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

      await fetchEpisodes();
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

      await fetchEpisodes();
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

      await fetchEpisodes();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container py-12 md:py-16">
        <div className="text-muted">Loading content…</div>
      </div>
    );
  }

  const filteredEpisodes = episodes.filter((ep) => {
    const e: any = ep as any;
    const t1 = (e.title_en || e.title || '').toLowerCase();
    const t2 = (e.title_rw || '').toLowerCase();
    const d1 = (e.description_en || e.description || '').toLowerCase();
    const d2 = (e.description_rw || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return t1.includes(q) || t2.includes(q) || d1.includes(q) || d2.includes(q);
  });

  return (
    <div className="container py-12 md:py-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Content Management</h1>
          <p className="text-muted">Upload and manage podcast episodes</p>
        </div>
        <button
          onClick={startNew}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
        >
          + New Episode
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="🔍 Search episodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
        />
      </div>

      {(editingId || showNewForm) && (
        <div className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Episode' : 'New Episode'}
          </h2>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Title (EN)</label>
                <input
                  type="text"
                  value={formData.title_en}
                  onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Title (RW)</label>
                <input
                  type="text"
                  value={formData.title_rw}
                  onChange={(e) => setFormData({ ...formData, title_rw: e.target.value })}
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Description (EN)</label>
                <textarea
                  value={formData.description_en}
                  onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (RW)</label>
                <textarea
                  value={formData.description_rw}
                  onChange={(e) => setFormData({ ...formData, description_rw: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
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
                    const base = formData.title_en || formData.title_rw;
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
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Meta Title (EN)</label>
                  <input value={formData.meta_title_en} onChange={(e)=>setFormData({ ...formData, meta_title_en: e.target.value })} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg"/>
                </div>
                <div>
                  <label className="block text-sm mb-1">Meta Title (RW)</label>
                  <input value={formData.meta_title_rw} onChange={(e)=>setFormData({ ...formData, meta_title_rw: e.target.value })} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg"/>
                </div>
                <div>
                  <label className="block text-sm mb-1">Meta Description (EN)</label>
                  <textarea value={formData.meta_description_en} onChange={(e)=>setFormData({ ...formData, meta_description_en: e.target.value })} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg" rows={2}/>
                </div>
                <div>
                  <label className="block text-sm mb-1">Meta Description (RW)</label>
                  <textarea value={formData.meta_description_rw} onChange={(e)=>setFormData({ ...formData, meta_description_rw: e.target.value })} className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg" rows={2}/>
                </div>
                <div className="md:col-span-2">
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
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Audio File</label>
                <button
                  type="button"
                  onClick={() => setUseAudioUrl(!useAudioUrl)}
                  className="text-xs text-primary hover:underline"
                >
                  {useAudioUrl ? '📁 Upload File' : '🔗 Use URL'}
                </button>
              </div>
              {useAudioUrl ? (
                <input
                  type="text"
                  value={formData.audio_url}
                  onChange={(e) => setFormData({ ...formData, audio_url: e.target.value })}
                  placeholder="https://example.com/audio.mp3"
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              ) : (
                <div>
                  <input
                    type="file"
                    accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/aac,audio/m4a"
                    onChange={handleAudioUpload}
                    disabled={uploadingAudio}
                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-black hover:file:opacity-90 disabled:opacity-50"
                  />
                  {uploadingAudio && <p className="text-xs text-primary mt-1">Uploading audio...</p>}
                  <p className="text-xs text-muted mt-1">Max 500MB. MP3, WAV, OGG, AAC, M4A. Duration auto-detected.</p>
                </div>
              )}
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
            <div>
              <label className="block text-sm font-medium mb-1">Duration (seconds)</label>
              <input
                type="number"
                value={formData.duration_seconds}
                onChange={(e) => setFormData({ ...formData, duration_seconds: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_premium"
                checked={formData.is_premium}
                onChange={(e) => setFormData({ ...formData, is_premium: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="is_premium" className="text-sm font-medium">Premium Episode</label>
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
        {filteredEpisodes.map((ep) => (
          <div key={ep.id} className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">{ep.title}</h3>
                <p className="text-sm text-muted mb-2">{ep.description || 'No description'}</p>
                <div className="flex gap-4 text-xs text-muted">
                  <span>{ep.duration_seconds ? `${Math.floor(ep.duration_seconds / 60)}m` : 'No duration'}</span>
                  <span>{ep.is_premium ? '👑 Premium' : 'Free'}</span>
                  <span>{ep.published_at ? `Published ${new Date(ep.published_at).toLocaleDateString()}` : 'Draft'}</span>
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
