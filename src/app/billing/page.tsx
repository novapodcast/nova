"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/i18n';
import { useSubscriptionCountdown } from '@/lib/useSubscriptionCountdown';

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
  effectiveStatus: 'active' | 'expiring_soon' | 'expired' | 'cancelled' | 'past_due';
  expires_at: string | null;
  daysRemaining: number | null;
  plan_name?: string | null;
}

export default function BillingPage() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const countdown = useSubscriptionCountdown(
    subscription && (subscription.effectiveStatus === 'active' || subscription.effectiveStatus === 'expiring_soon')
      ? subscription.expires_at
      : null
  );

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id || null;
      const token = sessionData.session?.access_token || null;
      if (!uid) {
        window.location.href = '/login?redirect=/billing';
        return;
      }
      setUserId(uid);

      // Canonical subscription state (same endpoint as dashboard + mobile)
      if (token) {
        const res = await fetch('/api/subscription-status', {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);
        if (res && res.ok) {
          const sub = await res.json();
          if (sub && sub.status !== 'none') {
            setSubscription({
              status: sub.status,
              effectiveStatus: sub.effectiveStatus,
              expires_at: sub.expiresAt,
              daysRemaining: sub.daysRemaining,
              plan_name: sub.planName || null,
            });
          }
        }
      }

      const { data: pays } = await supabase
        .from('payments')
        .select('id, transaction_id, amount, currency, status, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(20);
      setPayments((pays || []) as Payment[]);

      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="container py-12 md:py-16">
        <div className="text-muted">{t('common.loading', language)}</div>
      </div>
    );
  }

  const statusLabel = (sub: Subscription) => {
    if (sub.effectiveStatus === 'active') return t('billing.active', language);
    if (sub.effectiveStatus === 'expiring_soon') return language === 'rw' ? 'Izera vuba' : 'Expiring Soon';
    if (sub.effectiveStatus === 'expired') return language === 'rw' ? 'Yarangiye' : 'Expired';
    if (sub.effectiveStatus === 'cancelled') return language === 'rw' ? 'Byakuweho' : 'Cancelled';
    return t('billing.inactive', language);
  };

  return (
    <div className="container py-12 md:py-16 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t('billing.title', language)}</h1>
        <Link href="/dashboard" className="text-sm text-primary hover:underline">{t('common.viewDashboard', language)}</Link>
      </div>

      <div className="bg-[var(--surface)] rounded-xl p-5 ring-1 ring-white/5 mb-8">
        <div className="text-sm text-muted mb-2">{t('billing.currentPlan', language)}</div>
        {subscription ? (
          <div className="flex items-center justify-between">
            <div>
              {subscription.plan_name && (
                <div className="text-lg font-bold text-white">{subscription.plan_name}</div>
              )}
              <div className="text-xl font-semibold">{statusLabel(subscription)}</div>
              {(subscription.effectiveStatus === 'active' || subscription.effectiveStatus === 'expiring_soon') && countdown && (
                <div className="text-sm text-white font-medium mt-1">
                  {countdown} · {subscription.daysRemaining !== null ? (language === 'rw' ? `iminsi ${subscription.daysRemaining} isigaye` : `${subscription.daysRemaining} days remaining`) : ''}
                </div>
              )}
              {subscription.effectiveStatus === 'expired' && subscription.expires_at ? (
                <div className="text-sm text-muted">{language === 'rw' ? 'Byarangiye ku' : 'Expired on'} {new Date(subscription.expires_at).toLocaleDateString()}</div>
              ) : subscription.expires_at ? (
                <div className="text-sm text-muted">{t('billing.renews', language)} {new Date(subscription.expires_at).toLocaleDateString()}</div>
              ) : null}
            </div>
            <div className="flex gap-3">
              {(subscription.effectiveStatus === 'expired' || subscription.effectiveStatus === 'cancelled') && (
                <Link href="/pricing" className="text-sm text-primary hover:underline font-semibold">{language === 'rw' ? 'Kongera gushyura' : 'Renew Plan'}</Link>
              )}
              <Link href="/pricing" className="text-sm text-primary hover:underline">{t('billing.changePlan', language)}</Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-xl font-semibold">{t('billing.noActivePlan', language)}</div>
            <Link href="/pricing" className="text-sm text-primary hover:underline">{t('billing.browsePlans', language)}</Link>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">{t('billing.paymentHistory', language)}</h2>
        {payments.length === 0 && (
          <div className="text-muted">{t('billing.noPayments', language)}</div>
        )}
        {payments.length > 0 && (
          <div className="space-y-3">
            {payments.map((p) => (
              <div key={p.id} className="bg-[var(--surface)] rounded-lg p-4 ring-1 ring-white/5 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{p.amount.toLocaleString()} {p.currency}</div>
                  <div className="text-xs text-muted">{new Date(p.created_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs ${p.status === 'succeeded' ? 'text-green-400' : p.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}`}>{p.status}</span>
                  <Link href={`/receipts/${p.transaction_id}`} className="text-sm text-primary hover:underline">{t('billing.receipt', language)}</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
