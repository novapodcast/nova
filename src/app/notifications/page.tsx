"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/contexts/LanguageContext';

export default function NotificationPreferencesPage() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [followCount, setFollowCount] = useState<number | null>(null);
  const [prefs, setPrefs] = useState({
    new_episodes: true,
    followed_podcasts_only: false,
    email_enabled: true,
    push_enabled: false,
  });

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      const res = await fetch('/api/notifications/preferences', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.preferences) {
          setPrefs({
            new_episodes: data.preferences.new_episodes ?? true,
            followed_podcasts_only: data.preferences.followed_podcasts_only ?? false,
            email_enabled: data.preferences.email_enabled ?? true,
            push_enabled: data.preferences.push_enabled ?? false,
          });
        }
      }

      // Load followed podcasts count for context
      const { count } = await supabase
        .from('podcast_follows')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '');
      setFollowCount(typeof count === 'number' ? count : 0);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const savePrefs = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prefs),
      });
    } catch {
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-12 md:py-16">
        <div className="max-w-2xl mx-auto">
          <div className="h-8 w-48 bg-white/5 rounded mb-8 animate-pulse" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">
          {language === 'rw' ? 'Ibyo abamenyeshwa' : 'Notification Preferences'}
        </h1>
        <p className="text-muted mb-8">
          {language === 'rw'
            ? 'Hitamo uko ushaka kumenyeshwa ibintu bishya kuri Nova'
            : 'Choose how you want to be notified about new content on Nova'}
        </p>

        {/* Context: followed podcasts and push readiness */}
        <div className="mb-6 space-y-3">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm">
            {followCount === 0 && (
              <span>
                {language === 'rw'
                  ? 'Ntabwo urakurikira podcast. Kanda kuri “Kurikira” kuri podcasts ukunda kugira ngo uhabwe amakuru y’ibice bishya.'
                  : 'You are not following any podcasts yet. Follow podcasts you like to get notified about new episodes.'}
              </span>
            )}
            {typeof followCount === 'number' && followCount > 0 && (
              <span>
                {language === 'rw'
                  ? `Ukurikira podcasts ${followCount}. Imenyesha “Podcast njyewe gusa” izakora kuri zo.`
                  : `You follow ${followCount} podcasts. "Followed podcasts only" applies to them.`}
              </span>
            )}
          </div>
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm">
            {language === 'rw'
              ? 'Push notifications zirategurwa. Ubu imeri ziraboneka.'
              : 'Push notifications are coming soon. Email notifications are available today.'}
          </div>
        </div>

        <div className="space-y-4">
          <ToggleRow
            title={language === 'rw' ? 'Ibice bishya' : 'New Episodes'}
            description={language === 'rw' ? 'Menyeshwa igihe ibice bishya bitangazwa' : 'Get notified when new episodes are published'}
            value={prefs.new_episodes}
            onChange={(v) => setPrefs({ ...prefs, new_episodes: v })}
          />

          <ToggleRow
            title={language === 'rw' ? 'Podcast njyewe gusa' : 'Followed Podcasts Only'}
            description={language === 'rw' ? 'Menyeshwa gusa podcast ukurikirana' : 'Only notify about podcasts you follow'}
            value={prefs.followed_podcasts_only}
            onChange={(v) => setPrefs({ ...prefs, followed_podcasts_only: v })}
            disabled={!prefs.new_episodes}
          />

          <ToggleRow
            title={language === 'rw' ? 'Ku imeri' : 'Email Notifications'}
            description={language === 'rw' ? 'Akira imenyabintu ku imeri yawe' : 'Receive notifications via email'}
            value={prefs.email_enabled}
            onChange={(v) => setPrefs({ ...prefs, email_enabled: v })}
          />

          <ToggleRow
            title={language === 'rw' ? 'Push notifications' : 'Push Notifications'}
            description={language === 'rw' ? 'Akira imenyabintu kuri telefoni yawe' : 'Receive push notifications on your device'}
            value={prefs.push_enabled}
            onChange={(v) => setPrefs({ ...prefs, push_enabled: v })}
          />
        </div>

        <div className="mt-8">
          <button
            onClick={savePrefs}
            disabled={saving}
            className="px-6 py-2.5 bg-primary text-black font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {saving
              ? (language === 'rw' ? 'Birakomeje…' : 'Saving…')
              : (language === 'rw' ? 'Bika ibyatoranyijwe' : 'Save Preferences')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  value,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl bg-white/5 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex-1 mr-4">
        <h3 className="font-medium text-white">{title}</h3>
        <p className="text-sm text-muted mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        className={`relative w-12 h-6 rounded-full transition flex-shrink-0 ${
          value ? 'bg-primary' : 'bg-white/10'
        }`}
        role="switch"
        aria-checked={value}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            value ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
