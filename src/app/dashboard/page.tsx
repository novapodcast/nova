"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getCache, setCache } from '@/lib/cache';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/i18n';

type Health = {
  timestamp: string;
  mode: 'FULL' | 'DEMO' | 'SAFE';
  db: { ok: boolean; mode: 'admin' | 'anon' | 'none' };
  payments: { lastProcessedAt: string | null };
  ipn: { lastReceivedAt: string | null };
  reconciliation: { lastRunAt: string | null };
  analytics: { status: 'ok' | 'fallback' | 'degraded'; lastEventAt: string | null };
  subscriptions: { status: 'ok' | 'out_of_sync' | 'unknown' };
};

interface UserProfile {
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Subscription {
  plan_name: string;
  status: string;
  expires_at: string | null;
}

interface Favorite {
  id: string;
  episode_id: string;
  episodes: {
    title_en: string | null;
    title_rw: string | null;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    let active = true;
    
    const loadUserData = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!active) return;
      
      if (!sessionData.session) {
        router.replace('/login');
        return;
      }

      const email = sessionData.session.user.email || '';
      setUserEmail(email);

      // Load profile
      const cachedProfile = getCache<UserProfile>('dash_profile_v1');
      if (cachedProfile) setProfile(cachedProfile);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email, full_name, avatar_url')
        .eq('email', email)
        .single();
      
      if (profileData) {
        setProfile(profileData as UserProfile);
      }

      // Load subscription with plan details from pricing_tiers
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select('status, expires_at, current_period_end, plan_id')
        .eq('user_id', sessionData.session.user.id)
        .single();
      
      if (subData) {
        let planName = 'Unknown';
        // Look up plan name from pricing_tiers using plan_id
        if (subData.plan_id) {
          const cacheKey = `dash_tier_${subData.plan_id}`;
          let tierData = getCache<{ display_name_en?: string; plan_name?: string }>(cacheKey) as any;
          if (!tierData) {
            const { data } = await supabase
              .from('pricing_tiers')
              .select('display_name_en, plan_name')
              .eq('id', subData.plan_id)
              .single();
            tierData = data;
            if (tierData) setCache(cacheKey, tierData, 5 * 60 * 1000);
          }
          if (tierData) {
            planName = tierData.display_name_en || tierData.plan_name || 'Unknown';
          }
        }
        setSubscription({
          plan_name: planName,
          status: subData.status,
          expires_at: (subData as any).expires_at || (subData as any).current_period_end || null,
        });
      }

      // Load favorites
      const cacheKeyFavs = `dash_favs_${sessionData.session.user.id}_v1`;
      const cachedFavs = getCache<Favorite[]>(cacheKeyFavs);
      if (cachedFavs) setFavorites(cachedFavs);
      const { data: favData } = await supabase
        .from('favorites')
        .select(`
          id,
          episode_id,
          episodes!inner(
            title_en,
            title_rw
          )
        `)
        .eq('user_id', sessionData.session.user.id)
        .limit(5);
      
      if (favData) {
        const items = favData.map((f: any) => ({
          id: f.id,
          episode_id: f.episode_id,
          episodes: f.episodes
        })) as Favorite[];
        setFavorites(items);
        setCache(cacheKeyFavs, items, 60 * 1000);
      }

      setLoading(false);
    };

    loadUserData();
    // Load system health (observability)
    const loadHealth = async () => {
      try {
        const res = await fetch('/api/system/health');
        if (res.ok) {
          const json = await res.json();
          setHealth(json as Health);
        }
      } catch {}
    };
    loadHealth();
    
    return () => {
      active = false;
    };
  }, [router]);

  const onSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="container py-12 md:py-16">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">{t('dashboard.title', language)}</h1>
          <p className="text-muted">{t('dashboard.welcomeBack', language, { name: profile?.full_name || userEmail })}</p>
        </div>
        <button onClick={onSignOut} className="text-sm text-muted hover:text-white">{t('common.signOut', language)}</button>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mb-8">
        <div className="bg-[var(--surface)] rounded-xl p-5 ring-1 ring-white/5">
          <div className="text-sm text-muted mb-2">{t('dashboard.subscription', language)}</div>
          {subscription ? (
            <>
              <div className="text-xl font-semibold mb-1">{subscription.plan_name}</div>
              <div className="text-sm text-muted mb-3">
                {t('dashboard.status', language)}: <span className={subscription.status === 'active' ? 'text-green-400' : 'text-yellow-400'}>{subscription.status}</span>
              </div>
              {subscription.expires_at && (
                <div className="text-xs text-muted mb-3">
                  {t('dashboard.renews', language)}: {new Date(subscription.expires_at).toLocaleDateString()}
                </div>
              )}
              <Link href="/pricing" className="text-sm text-primary hover:underline">{t('dashboard.changePlan', language)}</Link>
            </>
          ) : (
            <>
              <div className="text-xl font-semibold mb-3">{t('dashboard.noActivePlan', language)}</div>
              <Link href="/pricing" className="inline-block text-sm text-primary hover:underline">{t('dashboard.browsePlans', language)}</Link>
            </>
          )}
        </div>

        <div className="bg-[var(--surface)] rounded-xl p-5 ring-1 ring-white/5">
          <div className="text-sm text-muted mb-2">{t('dashboard.profile', language)}</div>
          <div className="text-xl font-semibold mb-1">{profile?.full_name || t('dashboard.notSet', language)}</div>
          <div className="text-sm text-muted mb-3">{userEmail}</div>
          <Link href="/profile" className="text-sm text-primary hover:underline">{t('dashboard.editProfile', language)}</Link>
        </div>

        <div className="bg-[var(--surface)] rounded-xl p-5 ring-1 ring-white/5">
          <div className="text-sm text-muted mb-2">{t('dashboard.favorites', language)}</div>
          <div className="text-xl font-semibold mb-3">{favorites.length} {t('common.episodes', language)}</div>
          <Link href="/episodes" className="text-sm text-primary hover:underline">{t('dashboard.browseEpisodes', language)}</Link>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">{t('dashboard.yourFavorites', language)}</h2>
        {favorites.length === 0 && (
          <div className="bg-[var(--surface)] rounded-xl p-8 ring-1 ring-white/5 text-center">
            <div className="text-4xl mb-3">❤️</div>
            <p className="text-muted mb-4">You haven't added any favorites yet</p>
            <Link href="/episodes" className="inline-block px-4 py-2 rounded-lg bg-primary text-black font-semibold hover:opacity-90 transition text-sm">
              Browse Episodes
            </Link>
          </div>
        )}
        {favorites.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {favorites.map((fav) => (
              <Link
                key={fav.id}
                href={`/episodes/${fav.episode_id}`}
                className="bg-[var(--surface)] rounded-lg p-3 ring-1 ring-white/5 hover:ring-white/20 transition"
              >
                <div className="aspect-square rounded bg-black/40 mb-2" />
                <div className="text-sm font-semibold line-clamp-2">
                  {(language === 'rw' ? fav.episodes.title_rw : fav.episodes.title_en) || fav.episodes.title_en || fav.episodes.title_rw || t('episodes.untitled', language)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
