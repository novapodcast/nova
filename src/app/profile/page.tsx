"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { uploadAvatar } from '@/lib/upload';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/i18n';

interface UserProfile {
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [useUrlInput, setUseUrlInput] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!active) return;
      
      if (!sessionData.session) {
        router.replace('/login');
        return;
      }

      const email = sessionData.session.user.email || '';
      const uid = sessionData.session.user.id;
      setUserId(uid);
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email, full_name, avatar_url')
        .eq('email', email)
        .single();
      
      if (profileData) {
        setProfile(profileData as UserProfile);
        setFullName(profileData.full_name || '');
        setAvatarUrl(profileData.avatar_url || '');
      }
      setLoading(false);
    };
    loadProfile();
    return () => { active = false; };
  }, [router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File too large. Max 5MB.' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const { url } = await uploadAvatar(file, userId);
      setAvatarUrl(url);
      setMessage({ type: 'success', text: 'Avatar uploaded! Click Save to apply.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() || null, avatar_url: avatarUrl.trim() || null })
      .eq('email', profile.email);

    setSaving(false);
    if (error) {
      setMessage({ type: 'error', text: t('profile.updateError', language) });
    } else {
      setMessage({ type: 'success', text: t('profile.updateSuccess', language) });
      setProfile({ ...profile, full_name: fullName.trim() || null, avatar_url: avatarUrl.trim() || null });
    }
  };

  if (loading) {
    return (
      <div className="container py-12 md:py-16">
        <div className="max-w-2xl mx-auto">
          <div className="h-8 w-48 bg-white/5 rounded mb-6 animate-pulse" />
          <div className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5">
            <div className="space-y-4">
              <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
              <div className="h-10 w-full bg-white/5 rounded animate-pulse" />
              <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
              <div className="h-10 w-full bg-white/5 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{t('profile.editProfile', language)}</h1>

        <div className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">{t('profile.email', language)}</label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted mt-1">{t('profile.emailReadonly', language)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('profile.fullName', language)}</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('profile.fullNamePlaceholder', language)}
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">{t('profile.avatarUrl', language)}</label>
                <button
                  type="button"
                  onClick={() => setUseUrlInput(!useUrlInput)}
                  className="text-xs text-primary hover:underline"
                >
                  {useUrlInput ? '📁 Upload File' : '🔗 Use URL'}
                </button>
              </div>
              
              {useUrlInput ? (
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                />
              ) : (
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-black hover:file:opacity-90 disabled:opacity-50"
                  />
                  {uploading && <p className="text-xs text-primary">Uploading...</p>}
                </div>
              )}
              
              {avatarUrl && (
                <div className="mt-3">
                  <img src={avatarUrl} alt="Avatar preview" className="w-20 h-20 rounded-full object-cover border-2 border-white/10" />
                </div>
              )}
              <p className="text-xs text-muted mt-1">Max 5MB. JPG, PNG, WebP, or GIF.</p>
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {message.text}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-lg bg-primary text-black font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? t('common.saving', language) : t('common.save', language)}
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2.5 rounded-lg bg-white/5 text-white font-semibold hover:bg-white/10 transition"
              >
                {t('common.cancel', language)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
