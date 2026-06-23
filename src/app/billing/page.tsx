"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/i18n';

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
}

export default function BillingPage() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id || null;
      if (!uid) {
        window.location.href = '/login?redirect=/billing';
        return;
      }
      setUserId(uid);

      const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('status, expires_at')
        .eq('user_id', uid)
        .single();
      if (sub) setSubscription(sub as Subscription);

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

  return (
    <div className="container py-12 md:py-16 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Billing</h1>
        <Link href="/dashboard" className="text-sm text-primary hover:underline">{t('common.viewDashboard', language)}</Link>
      </div>

      <div className="bg-[var(--surface)] rounded-xl p-5 ring-1 ring-white/5 mb-8">
        <div className="text-sm text-muted mb-2">Current Plan</div>
        {subscription ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-semibold">{subscription.status === 'active' ? 'Active' : 'Inactive'}</div>
              {subscription.expires_at && (
                <div className="text-sm text-muted">Renews: {new Date(subscription.expires_at).toLocaleDateString()}</div>
              )}
            </div>
            <Link href="/pricing" className="text-sm text-primary hover:underline">Change plan</Link>
          </div>
        ) : (
          <div>
            <div className="text-xl font-semibold">No active plan</div>
            <Link href="/pricing" className="text-sm text-primary hover:underline">Browse plans</Link>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Payment History</h2>
        {payments.length === 0 && (
          <div className="text-muted">No payments yet.</div>
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
                  <Link href={`/receipts/${p.transaction_id}`} className="text-sm text-primary hover:underline">Receipt</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
