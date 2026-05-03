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

export default function AdminContentPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    audio_url: '',
    cover_image_url: '',
    duration_seconds: 0,
    is_premium: false,
  });
  const [saving, setSaving] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [useAudioUrl, setUseAudioUrl] = useState(false);
  const [useCoverUrl, setUseCoverUrl] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  function startEdit(ep: Episode) {
    setEditingId(ep.id);
    setFormData({
      title: ep.title,
      description: ep.description || '',
      audio_url: ep.audio_url || '',
      cover_image_url: ep.cover_image_url || '',
      duration_seconds: ep.duration_seconds || 0,
      is_premium: ep.is_premium,
    });
    setShowNewForm(false);
  }

  function startNew() {
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      audio_url: '',
      cover_image_url: '',
      duration_seconds: 0,
      is_premium: false,
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

  const filteredEpisodes = episodes.filter((ep) =>
    ep.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ep.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
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
