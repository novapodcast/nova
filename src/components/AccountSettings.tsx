'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { uploadAvatar } from '@/lib/upload';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../lib/i18n';

interface UserProfile {
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Payment {
  id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

interface Subscription {
  status: string;
  expires_at: string | null;
  plan_name?: string;
}

type Tab = 'profile' | 'billing' | 'invoices';

const validTab = (value: string | null): Tab => {
  if (value === 'billing' || value === 'invoices') return value;
  return 'profile';
};

export default function AccountSettings() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>(() => validTab(searchParams?.get('tab') ?? null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [useUrlInput, setUseUrlInput] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Sync active tab with URL query param
  useEffect(() => {
    const tab = validTab(searchParams?.get('tab') ?? null);
    setActiveTab(tab);
  }, [searchParams]);

  const changeTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (tab === 'profile') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const query = params.toString();
    router.replace(`${window.location.pathname}${query ? `?${query}` : ''}`, { scroll: false });
  };

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
      const uid = sessionData.session.user.id;
      setUserId(uid);
      setCreatedAt(sessionData.session.user.created_at || null);

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

      const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('status, expires_at, plan_id')
        .eq('user_id', uid)
        .single();

      if (sub) {
        const subRow = sub as any;
        let planName: string | undefined;
        if (subRow.plan_id) {
          const { data: tier } = await supabase
            .from('pricing_tiers')
            .select('display_name_en, plan_name')
            .eq('id', subRow.plan_id)
            .single();
          if (tier) {
            planName = (tier as any).display_name_en || (tier as any).plan_name;
          }
        }
        setSubscription({
          status: subRow.status,
          expires_at: subRow.expires_at || null,
          plan_name: planName,
        });
      }

      const { data: pays } = await supabase
        .from('payments')
        .select('id, transaction_id, amount, currency, status, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50);
      setPayments((pays || []) as Payment[]);

      setLoading(false);
    };
    loadData();
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

  const nameParts = useMemo(() => {
    const name = profile?.full_name || profile?.email || '';
    return name.trim().split(/\s+/).filter(Boolean);
  }, [profile]);

  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '-';
  const initials = useMemo(() => {
    const name = profile?.full_name || profile?.email || '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || '';
    const second = parts[1]?.[0] || '';
    return (first + second).toUpperCase() || name[0]?.toUpperCase() || '?';
  }, [profile]);

  const memberSince = useMemo(() => {
    if (!createdAt) return null;
    return new Date(createdAt).toLocaleDateString(language === 'rw' ? 'rw-RW' : 'en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [createdAt, language]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: t('profile.profile', language) },
    { key: 'billing', label: t('profile.billing', language) },
    { key: 'invoices', label: t('profile.invoices', language) },
  ];

  if (loading) {
    return (
      <div className="container py-12 md:py-16">
        <div className="max-w-5xl mx-auto">
          <div className="h-6 w-64 bg-white/5 rounded mb-3 animate-pulse" />
          <div className="h-10 w-48 bg-white/5 rounded mb-8 animate-pulse" />
          <div className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 h-96 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10 md:py-14">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <p className="text-muted mb-1">
              {t('profile.welcome', language, { name: profile?.full_name || profile?.email || '' })}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold">{t('profile.accountSettings', language)}</h1>
          </div>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary text-black font-semibold hover:opacity-90 transition text-sm"
          >
            {t('profile.viewPlans', language)}
          </Link>
        </div>

        <div className="flex items-center gap-2 md:gap-6 border-b border-white/10 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => changeTab(tab.key)}
              className={`pb-3 text-sm md:text-base font-medium transition border-b-2 ${
                activeTab === tab.key
                  ? 'border-primary text-white'
                  : 'border-transparent text-muted hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[var(--surface)] rounded-2xl p-8 ring-1 ring-white/5 flex flex-col items-center text-center">
                <div className="w-32 h-32 rounded-full bg-[#004d33] flex items-center justify-center text-white text-5xl font-semibold mb-5 border-4 border-white/5">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white mb-1">
                  {profile?.full_name || profile?.email || ''}
                </h2>
                {memberSince && (
                  <p className="text-sm text-muted">
                    {t('profile.memberSince', language)} {memberSince}
                  </p>
                )}
              </div>

              <div className="bg-[var(--surface)] rounded-2xl p-6 md:p-8 ring-1 ring-white/5">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {t('profile.personalDetails', language)}
                </h3>
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                  <div>
                    <div className="text-xs text-muted uppercase tracking-wide mb-1">{t('profile.firstName', language)}</div>
                    <div className="text-white font-medium">{firstName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted uppercase tracking-wide mb-1">{t('profile.lastName', language)}</div>
                    <div className="text-white font-medium">{lastName}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-muted uppercase tracking-wide mb-1">{t('profile.email', language)}</div>
                    <div className="text-white font-medium">{profile?.email || '-'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-muted uppercase tracking-wide mb-1">{t('profile.yourAccess', language)}</div>
                    <div className="text-white font-medium">
                      {subscription ? (subscription.status === 'active' ? t('profile.active', language) : t('profile.inactive', language)) : t('profile.noActivePlan', language)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[var(--surface)] rounded-2xl p-6 md:p-8 ring-1 ring-white/5">
              <h3 className="text-lg font-semibold text-white mb-6">{t('profile.editProfile', language)}</h3>
              <div className="grid md:grid-cols-2 gap-6">
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

                <div className="md:col-span-2">
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
                    <div className="mt-3 flex items-center gap-3">
                      <img src={avatarUrl} alt="Avatar preview" className="w-16 h-16 rounded-full object-cover border-2 border-white/10" />
                      <p className="text-xs text-muted">Max 5MB. JPG, PNG, WebP, or GIF.</p>
                    </div>
                  )}
                  {!avatarUrl && <p className="text-xs text-muted mt-1">Max 5MB. JPG, PNG, WebP, or GIF.</p>}
                </div>
              </div>

              {message && (
                <div className={`mt-6 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                  {message.text}
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-6 mt-6 border-t border-white/10">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-lg bg-primary text-black font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? t('profile.saving', language) : t('profile.save', language)}
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-6 py-2.5 rounded-lg bg-white/5 text-white font-semibold hover:bg-white/10 transition"
                >
                  {t('profile.cancel', language)}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="bg-[var(--surface)] rounded-2xl p-8 md:p-12 ring-1 ring-white/5 text-center">
            {subscription ? (
              <div className="max-w-xl mx-auto text-left">
                <div className="text-xs text-muted uppercase tracking-wide mb-2">{t('profile.currentPlan', language)}</div>
                <div className="text-2xl font-bold text-white mb-2">
                  {subscription.plan_name || (subscription.status === 'active' ? t('profile.active', language) : t('profile.inactive', language))}
                </div>
                <div className="text-sm text-muted mb-6">
                  {t('profile.status', language)}: <span className={subscription.status === 'active' ? 'text-green-400' : 'text-yellow-400'}>{subscription.status}</span>
                </div>
                {subscription.expires_at && (
                  <div className="text-sm text-muted mb-6">
                    {t('profile.renews', language)}: {new Date(subscription.expires_at).toLocaleDateString()}
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <Link href="/pricing" className="inline-flex items-center px-5 py-2.5 rounded-lg bg-primary text-black font-semibold hover:opacity-90 transition text-sm">
                    {t('profile.changePlan', language)}
                  </Link>
                  <Link href="/billing" className="inline-flex items-center px-5 py-2.5 rounded-lg bg-white/5 text-white font-semibold hover:bg-white/10 transition text-sm">
                    {t('profile.viewPlans', language)}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="max-w-md mx-auto">
                <div className="text-5xl mb-5">💳</div>
                <h3 className="text-xl font-semibold text-white mb-2">{t('profile.noBillingData', language)}</h3>
                <p className="text-sm text-muted mb-6">{t('profile.noBillingDataSubtitle', language)}</p>
                <Link
                  href="/pricing"
                  className="inline-flex items-center px-5 py-2.5 rounded-lg bg-primary text-black font-semibold hover:opacity-90 transition text-sm"
                >
                  {t('profile.viewPlans', language)}
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="bg-[var(--surface)] rounded-2xl ring-1 ring-white/5 overflow-hidden">
            {payments.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-5">🧾</div>
                <h3 className="text-xl font-semibold text-white mb-2">{t('profile.noInvoices', language)}</h3>
                <p className="text-sm text-muted mb-6">{t('profile.noBillingDataSubtitle', language)}</p>
                <Link
                  href="/pricing"
                  className="inline-flex items-center px-5 py-2.5 rounded-lg bg-primary text-black font-semibold hover:opacity-90 transition text-sm"
                >
                  {t('profile.viewPlans', language)}
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4 font-medium text-muted">{t('profile.invoiceNo', language)}</th>
                      <th className="px-6 py-4 font-medium text-muted">{t('profile.date', language)}</th>
                      <th className="px-6 py-4 font-medium text-muted">{t('profile.amount', language)}</th>
                      <th className="px-6 py-4 font-medium text-muted">{t('profile.status', language)}</th>
                      <th className="px-6 py-4 font-medium text-muted">{t('profile.actions', language)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition">
                        <td className="px-6 py-4 text-white font-medium">{p.transaction_id}</td>
                        <td className="px-6 py-4 text-muted">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-white font-semibold">{p.amount.toLocaleString()} {p.currency}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            p.status === 'succeeded' ? 'bg-green-500/10 text-green-400' : p.status === 'failed' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Link href={`/receipts/${p.transaction_id}`} className="text-primary hover:underline text-sm font-medium">
                            {t('profile.receipt', language)}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
