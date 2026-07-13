"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { selectAdminPodcasts } from '@/lib/data/podcasts';
import { useAdminGuard } from '@/lib/useAdminGuard';
import { uploadEpisodeCover } from '@/lib/upload';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [useCoverUrl, setUseCoverUrl] = useState(false);
  const [formData, setFormData] = useState({
    title_en: '',
    title_rw: '',
    description_en: '',
    description_rw: '',
    cover_image_url: '',
    category_id: '' as string,
    speaker_name: '',
    is_active: true,
  });

  useEffect(() => {
    if (!authorized) return;
    fetchPodcasts();
    fetchCategories();
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
    }
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
      cover_image_url: '',
      category_id: '',
      speaker_name: '',
      is_active: true,
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

  async function handleSave() {
    // Frontend validation: require at least one title
    if (!formData.title_en?.trim() && !formData.title_rw?.trim()) {
      alert('Please provide at least one title (English or Kinyarwanda)');
      return;
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
              <label className="block text-sm font-medium mb-2">Podcast Language</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, title_en: formData.title_en })}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/10 text-white"
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, title_rw: formData.title_rw })}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/10 text-white"
                >
                  Kinyarwanda
                </button>
              </div>
              <p className="text-xs text-muted mt-1">Fill in both languages for bilingual content.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
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
            <div className="grid md:grid-cols-2 gap-4">
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
        {regularPodcasts.map((p) => (
          <div key={p.id} className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5">
            <div className="flex items-start justify-between">
              <div className="flex-1 flex items-start gap-4">
                {p.cover_image_url && (
                  <img src={p.cover_image_url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                )}
                <div>
                  <h3 className="text-lg font-semibold">
                    {language === 'rw' ? p.title_rw : p.title_en}
                  </h3>
                  <p className="text-sm text-muted mb-2">
                    {language === 'rw' ? p.description_rw : p.description_en || 'No description'}
                  </p>
                  <div className="flex gap-4 text-xs text-muted">
                    <span>{p.total_episodes} episode{p.total_episodes !== 1 ? 's' : ''}</span>
                    <span>{p.speaker_name}</span>
                    <span>{p.is_active ? '✓ Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/admin/content?podcast=${p.id}`}
                  className="px-4 py-2 text-sm bg-primary text-black font-semibold rounded-lg hover:bg-primary/90 transition flex items-center gap-2"
                >
                  📝 Manage Episodes
                </Link>
                <button
                  onClick={() => startEdit(p)}
                  className="px-3 py-1 text-sm bg-white/10 text-white rounded hover:bg-white/20 transition"
                >
                  Edit Show
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  disabled={saving}
                  className="px-3 py-1 text-sm bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
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
