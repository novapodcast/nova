"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/i18n';

interface PricingTier {
  id: string;
  plan_name: string;
  display_name_en: string;
  duration_months: number;
  price_rwf: number;
  savings_rwf: number;
  features_en: string[];
  is_highlighted: boolean;
  is_active: boolean;
  sort_order: number;
}

export default function PricingPage() {
  const { language } = useLanguage();
  const [duration, setDuration] = useState<'1m' | '3m' | '6m'>('1m');
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTiers = async () => {
      const { data, error } = await supabase
        .from('pricing_tiers')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (!error && data) {
        setTiers(data as PricingTier[]);
      }
      setLoading(false);
    };
    loadTiers();
  }, []);

  // Group tiers by plan name (Basic, Pro, Premium)
  const groupedPlans = tiers.reduce((acc, tier) => {
    const baseName = tier.display_name_en;
    if (!acc[baseName]) acc[baseName] = {};
    const key = tier.duration_months === 1 ? '1m' : tier.duration_months === 3 ? '3m' : tier.duration_months === 6 ? '6m' : 'free';
    acc[baseName][key] = tier;
    return acc;
  }, {} as Record<string, Record<string, PricingTier>>);

  // Get Free plan separately
  const freePlan = tiers.find(t => t.plan_name === 'Free');

  // Filter out Free from grouped plans and get plan order
  const planNames = ['Basic', 'Pro', 'Premium'].filter(name => groupedPlans[name]);

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US');
  };

  const calculateSavingsPercent = (monthlyPrice: number, totalPrice: number, months: number) => {
    const fullPrice = monthlyPrice * months;
    const savings = fullPrice - totalPrice;
    if (savings <= 0) return 0;
    return Math.round((savings / fullPrice) * 100);
  };

  if (loading) {
    return (
      <div className="container py-12 md:py-16">
        <div className="text-center text-muted">{t('common.loading', language)}</div>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">{t('pricing.title', language)}</h1>
        <p className="text-muted max-w-2xl mx-auto">{t('pricing.subtitle', language)}</p>
      </div>

      {/* Duration Toggle */}
      <div className="flex justify-center gap-3 mb-12">
        {(['1m', '3m', '6m'] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDuration(d)}
            className={`px-6 py-2.5 rounded-full border transition ${
              duration === d
                ? 'bg-primary text-black border-primary font-semibold'
                : 'border-white/10 text-muted hover:border-white/30 hover:text-white'
            }`}
          >
            {d === '1m' && t('pricing.oneMonth', language)}
            {d === '3m' && t('pricing.threeMonths', language)}
            {d === '6m' && t('pricing.sixMonths', language)}
          </button>
        ))}
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {/* Free Plan */}
        {freePlan && (
          <div className="bg-[var(--surface)] rounded-2xl p-6 ring-1 ring-white/5 flex flex-col">
            <h3 className="text-xl font-bold mb-2">{freePlan.display_name_en}</h3>
            <div className="mb-4">
              <p className="text-3xl font-bold">{t('pricing.free', language)}</p>
            </div>
            <ul className="text-sm space-y-2.5 mb-6 flex-grow">
              {freePlan.features_en.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span className="text-muted">{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 text-white font-semibold hover:bg-white/10 transition text-center block"
            >
              {t('pricing.getStarted', language)}
            </Link>
          </div>
        )}

        {/* Paid Plans */}
        {planNames.map((planName) => {
          const planTiers = groupedPlans[planName];
          const currentTier = planTiers[duration];
          const monthlyTier = planTiers['1m'];
          
          if (!currentTier) return null;

          const savingsPercent = duration !== '1m' && monthlyTier
            ? calculateSavingsPercent(monthlyTier.price_rwf, currentTier.price_rwf, currentTier.duration_months)
            : 0;

          return (
            <div
              key={planName}
              className={`rounded-2xl p-6 flex flex-col relative ${
                currentTier.is_highlighted
                  ? 'bg-gradient-to-b from-primary/10 to-[var(--surface)] ring-2 ring-primary scale-105 md:scale-105'
                  : 'bg-[var(--surface)] ring-1 ring-white/5'
              }`}
            >
              {currentTier.is_highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-black text-xs font-bold rounded-full">
                  ⭐ {t('admin.mostPopular', language)}
                </div>
              )}
              
              <h3 className="text-xl font-bold mb-2">{currentTier.display_name_en}</h3>
              
              <div className="mb-4">
                <p className="text-3xl font-bold">{formatPrice(currentTier.price_rwf)} RWF</p>
                <p className="text-sm text-muted mt-1">
                  {duration === '1m' ? t('pricing.perMonth', language) : t('pricing.forMonths', language, { count: currentTier.duration_months })}
                </p>
                {savingsPercent > 0 && (
                  <p className="text-sm text-green-400 font-semibold mt-1">
                    {t('pricing.save', language, { percent: savingsPercent })}
                  </p>
                )}
              </div>

              <ul className="text-sm space-y-2.5 mb-6 flex-grow">
                {currentTier.features_en.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">✓</span>
                    <span className="text-muted">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={`w-full px-4 py-2.5 rounded-lg font-semibold transition text-center block ${
                  currentTier.is_highlighted
                    ? 'bg-primary text-black hover:opacity-90'
                    : 'bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                {t('pricing.choosePlan', language)}
              </Link>
            </div>
          );
        })}
      </div>

      <div className="mt-12 text-center text-sm text-muted">
        <p>{t('pricing.allPricesInRWF', language)} {t('pricing.needCustom', language)} <Link href="/contact" className="text-primary hover:underline">{t('pricing.contactUs', language)}</Link></p>
      </div>
    </div>
  );
}
