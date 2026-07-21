"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '../../../contexts/LanguageContext';
import { t } from '../../../lib/i18n';

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method?: string | null;
  description?: string | null;
  created_at: string;
}

export default function BillingHistoryPage() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (!user) {
          window.location.href = `/login?redirect=/billing/history`;
          return;
        }
        const { data, error } = await supabase
          .from('payments')
          .select('id, amount, currency, status, method, description, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        if (!active) return;
        setRows((data as any[]) as PaymentRow[]);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || 'Failed to load payments');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="container py-12 md:py-16">
        <div className="text-muted">{t('billing.loading', language)}</div>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-16 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">{t('billing.history', language)}</h1>
      <p className="text-muted mb-6">{t('billing.recentPayments', language)}</p>

      {error && <div className="text-red-400 text-sm mb-4">{error}</div>}

      {rows.length === 0 ? (
        <div className="rounded-xl p-6 bg-[var(--surface)] ring-1 ring-white/5">
          <p className="text-muted">{t('billing.noPaymentsFound', language)}</p>
          <div className="mt-4">
            <Link href="/pricing" className="px-4 py-2 rounded-md bg-primary text-black font-semibold hover:opacity-90 inline-block">{t('billing.getStarted', language)}</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <div key={p.id} className="rounded-xl p-4 bg-[var(--surface)] ring-1 ring-white/5 flex items-center justify-between">
              <div>
                <div className="text-white font-semibold">{p.description || t('billing.subscriptionPayment', language)}</div>
                <div className="text-xs text-muted mt-1">{new Date(p.created_at).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="font-bold">{(p.amount || 0).toLocaleString()} {p.currency || 'RWF'}</div>
                <div className={`text-xs mt-1 ${p.status === 'succeeded' ? 'text-green-400' : p.status === 'failed' ? 'text-red-400' : 'text-muted'}`}>{p.status}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
