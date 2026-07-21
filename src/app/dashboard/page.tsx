"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/contexts/LanguageContext';
import { t, renderInsight } from '@/lib/i18n';

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

interface AnalyticsData {
  episodesCompleted: number;
  totalProgress: number;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  minutesToday: number;
  minutesThisWeek: number;
  minutesThisMonth: number;
  minutesLifetime: number;
  episodesStarted: number;
  weeklyActivity: { day: string; count: number; minutes: number }[];
  topPodcasts: { podcast_id: string; title_en: string; title_rw: string; cover_url: string | null; listen_count: number; speaker_name: string | null }[];
  topCategories: { category: string; count: number }[];
  topSpeakers: { speaker: string; count: number }[];
  listeningPattern: { period: string; count: number; percentage: number }[];
  favoriteDay: string | null;
  continueListening: { episode_id: string; title_en: string | null; title_rw: string | null; cover_image_url: string | null; podcast_title_en: string | null; podcast_title_rw: string | null; position_seconds: number; duration_seconds: number | null; progress_percent: number }[];
  recentlyCompleted: { episode_id: string; title_en: string | null; title_rw: string | null; cover_image_url: string | null; podcast_title_en: string | null; podcast_title_rw: string | null; completed_at: string }[];
  insights: { type: string; params?: Record<string, any> }[];
}

interface RecGroup {
  titleKey: string;
  titleParams?: Record<string, any>;
  episodes: { id: string; title_en: string | null; title_rw: string | null; cover_image_url: string | null; duration_seconds: number | null; podcasts: { id: string; title_en: string | null; title_rw: string | null; cover_image_url: string | null } | null }[];
}

type MinuteTab = 'today' | 'week' | 'month' | 'lifetime';

export default function DashboardPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recGroups, setRecGroups] = useState<RecGroup[]>([]);
  const [minuteTab, setMinuteTab] = useState<MinuteTab>('week');

  const greetingKey = useCallback(() => {
    const h = new Date().getHours();
    if (h < 12) return 'dashboard.goodMorning';
    if (h < 17) return 'dashboard.goodAfternoon';
    return 'dashboard.goodEvening';
  }, []);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!active) return;
      if (!sessionData.session) {
        router.replace('/login');
        return;
      }

      const email = sessionData.session.user.email || '';
      const token = sessionData.session.access_token;
      setUserEmail(email);

      // Load profile + subscription in parallel with analytics + recommendations
      const profilePromise = supabase
        .from('profiles')
        .select('email, full_name, avatar_url')
        .eq('email', email)
        .single();

      const subPromise = supabase
        .from('user_subscriptions')
        .select('status, expires_at, current_period_end, plan_id')
        .eq('user_id', sessionData.session.user.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      const analyticsPromise = fetch('/api/analytics/user', {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.ok ? r.json() : null).catch(() => null);

      const recsPromise = fetch('/api/recommendations', {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.ok ? r.json() : null).catch(() => null);

      const [profileRes, subRes, analyticsData, recsData] = await Promise.all([
        profilePromise, subPromise, analyticsPromise, recsPromise,
      ]);

      if (!active) return;

      if (profileRes.data) setProfile(profileRes.data as UserProfile);

      const subData = (subRes.data && subRes.data.length > 0) ? subRes.data[0] : null;
      if (subData) {
        let planName = 'Unknown';
        if ((subData as any).plan_id) {
          const { data: tier } = await supabase
            .from('pricing_tiers')
            .select('display_name_en, plan_name')
            .eq('id', (subData as any).plan_id)
            .single();
          if (tier) planName = (tier as any).display_name_en || (tier as any).plan_name || 'Unknown';
        }
        if (planName === 'Unknown' && subData.status === 'active') planName = 'Active subscription';
        setSubscription({
          plan_name: planName,
          status: subData.status,
          expires_at: (subData as any).expires_at || (subData as any).current_period_end || null,
        });
      }

      if (analyticsData) setAnalytics(analyticsData as AnalyticsData);
      if (recsData?.groups) setRecGroups(recsData.groups as RecGroup[]);

      setLoading(false);
    };

    loadData();
    return () => { active = false; };
  }, [router]);

  const onSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const initials = (profile?.full_name || userEmail || '').trim().split(/\s+/).filter(Boolean)
    .slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';

  const displayName = profile?.full_name || userEmail;
  const hasListeningHistory = analytics && (analytics.totalProgress > 0 || analytics.episodesStarted > 0);

  // --- Achievements computation ---
  const achievements = analytics ? [
    { icon: '🎧', label: t('dashboard.firstPodcast', language), unlocked: analytics.episodesStarted >= 1 },
    { icon: '📚', label: t('dashboard.tenEpisodes', language), unlocked: analytics.episodesCompleted >= 10 },
    { icon: '🔥', label: t('dashboard.sevenDayStreak', language), unlocked: analytics.longestStreak >= 7 },
    { icon: '⏱️', label: t('dashboard.hundredHours', language), unlocked: analytics.minutesLifetime >= 6000 },
    { icon: '🌍', label: t('dashboard.explorer', language), unlocked: analytics.topCategories.length >= 3 },
    { icon: '✅', label: t('dashboard.consistentListener', language), unlocked: analytics.currentStreak >= 14 },
  ] : [];

  if (loading) {
    return (
      <div className="container py-8 md:py-12 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-white/5 animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[var(--surface)] rounded-xl p-5 ring-1 ring-white/5 h-28 animate-pulse" />
          ))}
        </div>
        <div className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 h-32 animate-pulse mb-6" />
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 h-40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 md:py-10 max-w-5xl mx-auto">
      {/* === 1. HERO === */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#004d33] flex items-center justify-center text-white text-xl font-semibold border-2 border-white/5 flex-shrink-0 overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {t(greetingKey(), language, { name: displayName })}
              <span className="ml-1">👋</span>
            </h1>
            <button onClick={onSignOut} className="text-xs text-muted hover:text-white mt-1">
              {t('common.signOut', language)}
            </button>
          </div>
        </div>
      </div>

      {/* Continue Listening card */}
      {analytics?.continueListening && analytics.continueListening.length > 0 ? (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted mb-3">{t('dashboard.continueListening', language)}</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {analytics.continueListening.map((item) => (
              <Link
                key={item.episode_id}
                href={`/episodes/${item.episode_id}`}
                className="flex-shrink-0 w-72 bg-[var(--surface)] rounded-xl p-3 ring-1 ring-white/5 hover:ring-white/20 transition group"
              >
                <div className="flex gap-3">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-black/40">
                    {item.cover_image_url && (
                      <Image src={item.cover_image_url} alt="" fill sizes="64px" className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-white truncate group-hover:text-primary transition">
                      {(language === 'rw' ? item.title_rw : item.title_en) || item.title_en || t('common.untitled', language)}
                    </h3>
                    <p className="text-xs text-muted truncate">
                      {(language === 'rw' ? item.podcast_title_rw : item.podcast_title_en) || ''}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${item.progress_percent}%` }} />
                      </div>
                      <span className="text-xs text-muted">{item.progress_percent}%</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 self-center">
                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition">
                      <svg className="w-4 h-4 text-primary ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 mb-6 text-center">
          <p className="text-muted text-sm mb-3">{t('dashboard.noInProgress', language)}</p>
          <Link href="/podcasts" className="inline-block px-4 py-2 rounded-lg bg-primary text-black font-semibold hover:opacity-90 transition text-sm">
            {t('dashboard.browsePodcasts', language)}
          </Link>
        </div>
      )}

      {/* === 2. PERSONAL PROGRESS STRIP === */}
      {analytics && (
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
          {/* Streak */}
          <div className="bg-[var(--surface)] rounded-xl p-4 ring-1 ring-white/5">
            <div className="text-2xl mb-1">🔥</div>
            <div className="text-xl md:text-2xl font-bold text-white">{analytics.currentStreak}</div>
            <div className="text-xs text-muted">{t('dashboard.currentStreak', language)} {t('dashboard.days', language)}</div>
            <div className="text-xs text-muted mt-1">🏆 {analytics.longestStreak} {t('dashboard.bestStreak', language)}</div>
          </div>
          {/* Minutes */}
          <div className="bg-[var(--surface)] rounded-xl p-4 ring-1 ring-white/5">
            <div className="text-2xl mb-1">🎧</div>
            <div className="text-xl md:text-2xl font-bold text-white">
              {minuteTab === 'today' ? analytics.minutesToday
                : minuteTab === 'week' ? analytics.minutesThisWeek
                : minuteTab === 'month' ? analytics.minutesThisMonth
                : analytics.minutesLifetime}
            </div>
            <div className="flex gap-1 mt-1 flex-wrap">
              {(['today', 'week', 'month', 'lifetime'] as MinuteTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMinuteTab(tab)}
                  className={`text-[10px] px-1.5 py-0.5 rounded transition ${
                    minuteTab === tab ? 'bg-primary/20 text-primary' : 'text-muted hover:text-white'
                  }`}
                >
                  {t(`dashboard.${tab === 'today' ? 'today' : tab === 'week' ? 'thisWeek' : tab === 'month' ? 'thisMonth' : 'lifetime'}`, language)}
                </button>
              ))}
            </div>
          </div>
          {/* Episodes */}
          <div className="bg-[var(--surface)] rounded-xl p-4 ring-1 ring-white/5">
            <div className="text-2xl mb-1">▶️</div>
            <div className="text-xl md:text-2xl font-bold text-white">{analytics.episodesStarted}</div>
            <div className="text-xs text-muted">{t('dashboard.started', language)}</div>
            <div className="text-xs text-muted mt-1">
              ✅ {analytics.episodesCompleted} {t('dashboard.completed', language)} · {analytics.completionRate}%
            </div>
          </div>
        </div>
      )}

      {/* === 3. WEEKLY ACTIVITY === */}
      {analytics && analytics.weeklyActivity.length > 0 && (
        <div className="bg-[var(--surface)] rounded-xl p-5 ring-1 ring-white/5 mb-6">
          <h2 className="text-sm font-medium text-muted mb-4">{t('dashboard.weeklyActivity', language)}</h2>
          <div className="flex items-end justify-between gap-2 h-24">
            {analytics.weeklyActivity.map((day, i) => {
              const maxCount = Math.max(...analytics.weeklyActivity.map((d) => d.count), 1);
              const height = day.count > 0 ? Math.max(4, (day.count / maxCount) * 100) : 2;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[10px] text-muted">{day.count > 0 ? day.count : ''}</div>
                  <div
                    className={`w-full rounded-t transition-all ${day.count > 0 ? 'bg-primary/60 hover:bg-primary' : 'bg-white/5'}`}
                    style={{ height: `${height}%` }}
                    aria-label={`${day.day}: ${day.count} episodes`}
                  />
                  <div className="text-[10px] text-muted">{day.day}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* === 4. LISTENING JOURNEY (insights) === */}
      {analytics && analytics.insights.length > 0 && (
        <div className="bg-[var(--surface)] rounded-xl p-5 ring-1 ring-white/5 mb-6">
          <h2 className="text-sm font-medium text-muted mb-3">{t('dashboard.listeningJourney', language)}</h2>
          <div className="space-y-2">
            {analytics.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-white/90">
                <span className="text-primary mt-0.5">•</span>
                <span>{renderInsight(insight, language)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === 5. LISTENING DNA === */}
      {analytics && hasListeningHistory && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted mb-3">{t('dashboard.yourListeningDNA', language)}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Top Podcast */}
            {analytics.topPodcasts.length > 0 && (
              <div className="bg-[var(--surface)] rounded-xl p-4 ring-1 ring-white/5">
                <div className="text-xs text-muted mb-2">{t('dashboard.topPodcast', language)}</div>
                <div className="flex items-center gap-2">
                  {analytics.topPodcasts[0].cover_url && (
                    <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-black/40">
                      <Image src={analytics.topPodcasts[0].cover_url} alt="" fill sizes="40px" className="object-cover" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {(language === 'rw' ? analytics.topPodcasts[0].title_rw : analytics.topPodcasts[0].title_en) || analytics.topPodcasts[0].title_en}
                    </div>
                    <div className="text-xs text-muted">{analytics.topPodcasts[0].listen_count} {t('common.plays', language)}</div>
                  </div>
                </div>
              </div>
            )}
            {/* Top Category */}
            {analytics.topCategories.length > 0 && (
              <div className="bg-[var(--surface)] rounded-xl p-4 ring-1 ring-white/5">
                <div className="text-xs text-muted mb-2">{t('dashboard.topCategory', language)}</div>
                <div className="text-lg font-semibold text-white">{analytics.topCategories[0].category}</div>
                <div className="text-xs text-muted">{analytics.topCategories[0].count} {t('common.plays', language)}</div>
              </div>
            )}
            {/* Favorite Speaker */}
            {analytics.topSpeakers.length > 0 && analytics.topSpeakers[0].speaker && (
              <div className="bg-[var(--surface)] rounded-xl p-4 ring-1 ring-white/5">
                <div className="text-xs text-muted mb-2">{t('dashboard.favoriteSpeaker', language)}</div>
                <div className="text-lg font-semibold text-white truncate">{analytics.topSpeakers[0].speaker}</div>
                <div className="text-xs text-muted">{analytics.topSpeakers[0].count} {t('common.plays', language)}</div>
              </div>
            )}
            {/* Favorite Time */}
            {analytics.listeningPattern.length > 0 && analytics.listeningPattern[0].count > 0 && (
              <div className="bg-[var(--surface)] rounded-xl p-4 ring-1 ring-white/5">
                <div className="text-xs text-muted mb-2">{t('dashboard.favoriteTime', language)}</div>
                <div className="text-lg font-semibold text-white">
                  {t(`dashboard.${analytics.listeningPattern[0].period.toLowerCase()}`, language)}
                </div>
                <div className="text-xs text-muted">{analytics.listeningPattern[0].percentage}%</div>
              </div>
            )}
            {/* Favorite Day */}
            {analytics.favoriteDay && (
              <div className="bg-[var(--surface)] rounded-xl p-4 ring-1 ring-white/5">
                <div className="text-xs text-muted mb-2">{t('dashboard.favoriteDay', language)}</div>
                <div className="text-lg font-semibold text-white">{analytics.favoriteDay}</div>
              </div>
            )}
            {/* Completion Rate */}
            {analytics.totalProgress > 0 && (
              <div className="bg-[var(--surface)] rounded-xl p-4 ring-1 ring-white/5">
                <div className="text-xs text-muted mb-2">{t('dashboard.completionRate', language)}</div>
                <div className="text-lg font-semibold text-white">{analytics.completionRate}%</div>
                <div className="text-xs text-muted">{analytics.episodesCompleted}/{analytics.totalProgress}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === 6. RECENTLY FINISHED === */}
      {analytics && analytics.recentlyCompleted.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted mb-3">{t('dashboard.recentlyFinished', language)}</h2>
          <div className="space-y-2">
            {analytics.recentlyCompleted.map((item) => (
              <Link
                key={item.episode_id}
                href={`/episodes/${item.episode_id}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface)] ring-1 ring-white/5 hover:ring-white/20 transition group"
              >
                <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-black/40">
                  {item.cover_image_url && (
                    <Image src={item.cover_image_url} alt="" fill sizes="48px" className="object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-white truncate group-hover:text-primary transition">
                    {(language === 'rw' ? item.title_rw : item.title_en) || item.title_en || t('common.untitled', language)}
                  </h3>
                  <p className="text-xs text-muted truncate">
                    {(language === 'rw' ? item.podcast_title_rw : item.podcast_title_en) || ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted">{new Date(item.completed_at).toLocaleDateString()}</span>
                  <span className="text-green-400 text-sm">✓</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* === 7. DISCOVER MORE === */}
      {recGroups.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted mb-3">{t('dashboard.discoverMore', language)}</h2>
          <div className="space-y-5">
            {recGroups.map((group, gi) => (
              <div key={gi}>
                <h3 className="text-xs text-muted mb-2 italic">{t(group.titleKey, language, group.titleParams)}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {group.episodes.map((ep) => (
                    <Link
                      key={ep.id}
                      href={`/episodes/${ep.id}`}
                      className="bg-[var(--surface)] rounded-lg p-3 ring-1 ring-white/5 hover:ring-white/20 transition group"
                    >
                      <div className="relative aspect-square rounded-lg overflow-hidden mb-2 bg-black/40">
                        {(ep.cover_image_url || ep.podcasts?.cover_image_url) && (
                          <Image
                            src={ep.cover_image_url || ep.podcasts!.cover_image_url!}
                            alt=""
                            fill
                            sizes="150px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="text-xs font-medium text-white line-clamp-2 group-hover:text-primary transition">
                        {(language === 'rw' ? ep.title_rw : ep.title_en) || ep.title_en || t('common.untitled', language)}
                      </div>
                      <div className="text-[10px] text-muted truncate mt-0.5">
                        {(language === 'rw' ? ep.podcasts?.title_rw : ep.podcasts?.title_en) || ''}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === 8. SUBSCRIPTION (compact, bottom) === */}
      <div className="bg-[var(--surface)] rounded-xl p-4 ring-1 ring-white/5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="text-2xl">💳</div>
            <div>
              <div className="text-sm font-semibold text-white">
                {subscription ? subscription.plan_name : t('dashboard.noActivePlan', language)}
              </div>
              <div className="text-xs text-muted">
                {subscription ? (
                  <>
                    <span className={subscription.status === 'active' ? 'text-green-400' : 'text-yellow-400'}>{t(`dashboard.status${subscription.status.split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`, language)}</span>
                    {subscription.expires_at && ` · ${t('dashboard.renews', language)} ${new Date(subscription.expires_at).toLocaleDateString()}`}
                  </>
                ) : (
                  t('dashboard.noActivePlan', language)
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/pricing" className="text-sm text-primary hover:underline">{t('dashboard.changePlan', language)}</Link>
            <Link href="/profile" className="text-sm text-primary hover:underline">{t('dashboard.manage', language)}</Link>
            <Link href="/billing" className="text-sm text-primary hover:underline">{t('common.billing', language)}</Link>
          </div>
        </div>
      </div>

      {/* === 9. ACHIEVEMENTS === */}
      {analytics && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted mb-3">{t('dashboard.achievements', language)}</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {achievements.map((ach, i) => (
              <div
                key={i}
                className={`bg-[var(--surface)] rounded-xl p-3 ring-1 ring-white/5 text-center transition ${
                  ach.unlocked ? 'ring-primary/20' : 'opacity-40'
                }`}
                aria-label={`${ach.label}: ${ach.unlocked ? t('dashboard.unlocked', language) : t('dashboard.locked', language)}`}
              >
                <div className="text-2xl mb-1">{ach.icon}</div>
                <div className="text-[10px] text-muted leading-tight">{ach.label}</div>
                {ach.unlocked && <div className="text-[9px] text-primary mt-1">✓</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for brand new users */}
      {!hasListeningHistory && !loading && (
        <div className="bg-[var(--surface)] rounded-xl p-8 ring-1 ring-white/5 text-center mb-6">
          <div className="text-4xl mb-3">🎧</div>
          <p className="text-muted mb-4">{t('dashboard.noListeningHistory', language)}</p>
          <Link href="/podcasts" className="inline-block px-6 py-2.5 rounded-lg bg-primary text-black font-semibold hover:opacity-90 transition text-sm">
            {t('dashboard.browsePodcasts', language)}
          </Link>
        </div>
      )}
    </div>
  );
}
