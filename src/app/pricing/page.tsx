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
  display_name_rw: string;
  duration_months: number;
  price_rwf: number;
  savings_rwf: number;
  features_en: string[];
  features_rw: string[];
  is_highlighted: boolean;
  is_active: boolean;
  sort_order: number;
}

export default function PricingPage() {
  const { language } = useLanguage();
  const [duration, setDuration] = useState<'1m' | '12m'>('1m');
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
        const filtered = (data as PricingTier[]).filter((t) => [0, 1, 12].includes(t.duration_months));
        setTiers(filtered);
      }
      setLoading(false);
    };
    loadTiers();
  }, []);

  // Group tiers by plan name (Basic, Pro, Premium)
  const groupedPlans = tiers.reduce((acc, tier) => {
    const baseName = tier.display_name_en;
    if (!acc[baseName]) acc[baseName] = {};
    const key = tier.duration_months === 1 ? '1m' : tier.duration_months === 12 ? '12m' : 'free';
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

      {/* Billing Toggle: Monthly vs Annual (12m) */}
      <div className="flex items-center justify-center gap-3 mb-12">
        {(['1m', '12m'] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDuration(d)}
            className={`px-6 py-2.5 rounded-full border transition ${
              duration === d
                ? 'bg-primary text-black border-primary font-semibold'
                : 'border-white/10 text-muted hover:border-white/30 hover:text-white'
            }`}
          >
            {d === '1m' ? t('pricing.billingMonthly', language) : t('pricing.billingAnnual', language)}
          </button>
        ))}
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {/* Free Plan */}
        {freePlan && (
          <div className="bg-[var(--surface)] rounded-2xl p-6 ring-1 ring-white/5 flex flex-col">
            <h3 className="text-xl font-bold mb-2">{language === 'rw' ? freePlan.display_name_rw : freePlan.display_name_en}</h3>
            <div className="mb-4">
              <p className="text-3xl font-bold">0 RWF</p>
              <p className="text-sm text-muted mt-1">forever</p>
            </div>
            <ul className="text-sm space-y-2.5 mb-6 flex-grow">
              {(language === 'rw' ? freePlan.features_rw : freePlan.features_en).map((feature, idx) => (
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

          if (!currentTier || !monthlyTier) return null;

          const isAnnual = duration === '12m';
          const monthlyEffective = isAnnual ? Math.round(currentTier.price_rwf / 12) : monthlyTier.price_rwf;
          const savingsPercent = isAnnual
            ? calculateSavingsPercent(monthlyTier.price_rwf, currentTier.price_rwf, currentTier.duration_months)
            : 0;

          const marketingName: Record<string, string> = { Basic: 'Younger', Pro: 'Brave', Premium: 'Genius' };

          // Feature list with graceful fallback: if annual tier has empty features, use monthly tier features
          const featuresForLanguage = (tier: PricingTier) => (language === 'rw' ? tier.features_rw : tier.features_en) || [];
          const currentFeatures = featuresForLanguage(currentTier);
          const displayFeatures = currentFeatures.length > 0 ? currentFeatures : featuresForLanguage(monthlyTier);

          return (
            <div
              key={planName}
              className={`rounded-2xl p-6 flex flex-col relative ${
                currentTier.is_highlighted
                  ? 'bg-gradient-to-b from-primary/10 to-[var(--surface)] ring-2 ring-primary md:scale-[1.02]'
                  : 'bg-[var(--surface)] ring-1 ring-white/5'
              }`}
            >
              {currentTier.is_highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-black text-xs font-bold rounded-full">
                  ⭐ {t('admin.mostPopular', language)}
                </div>
              )}

              <h3 className="text-xl font-bold mb-1">{language === 'rw' ? currentTier.display_name_rw : currentTier.display_name_en}</h3>
              <div className="text-xs text-muted mb-3">The {marketingName[planName] ?? ''} Choice</div>

              <div className="mb-4">
                {isAnnual && (
                  <div className="text-xs line-through text-white/40 mb-1">{formatPrice(monthlyTier.price_rwf)} RWF / mo</div>
                )}
                <p className="text-3xl font-bold">{formatPrice(monthlyEffective)} RWF</p>
                <p className="text-sm text-muted mt-1">
                  {isAnnual ? t('pricing.billedYearly', language) : t('pricing.perMonth', language)}
                </p>
                {isAnnual && (
                  <p className="text-xs font-semibold mt-2 inline-block px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                    {t('pricing.annualDiscount', language)}
                  </p>
                )}
              </div>

              <ul className="text-sm space-y-2.5 mb-6 flex-grow">
                {displayFeatures.map((feature, idx) => (
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
