"use client";
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  features_en: string[];
  features_rw: string[];
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const planId = searchParams?.get('plan');

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [plan, setPlan] = useState<PricingTier | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'airtel' | 'mtn' | 'card'>('airtel');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    const loadData = async () => {
      // Check authentication
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace('/login?redirect=/checkout?plan=' + planId);
        return;
      }

      setUser(sessionData.session.user);

      // Load plan details
      if (planId) {
        const { data: planData } = await supabase
          .from('pricing_tiers')
          .select('*')
          .eq('id', planId)
          .single();
        
        if (planData) {
          setPlan(planData as PricingTier);
        } else {
          router.replace('/pricing');
          return;
        }
      } else {
        router.replace('/pricing');
        return;
      }

      setLoading(false);
    };

    loadData();
  }, [planId, router]);

  const handlePayment = async () => {
    if (!user || !plan) return;

    if (paymentMethod !== 'card' && !phoneNumber) {
      alert(language === 'rw' ? 'Injiza nimero ya telefoni' : 'Please enter phone number');
      return;
    }

    setProcessing(true);

    try {
      const idempotencyKey = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      
      const paymentRequest = {
        amount: plan.price_rwf,
        currency: 'RWF',
        description: `Nova Podcast - ${plan.display_name_en} Subscription (${plan.duration_months} month${plan.duration_months > 1 ? 's' : ''})`,
        callbackUrl: `${window.location.origin}/payment-callback`,
        notificationId: '',
        userId: user.id,
        method: paymentMethod,
        idempotencyKey,
        billingAddress: {
          emailAddress: user.email,
          phoneNumber: paymentMethod !== 'card' ? phoneNumber : undefined,
        },
      };

      // Register IPN
      const ipnRes = await fetch('/api/pesapal/ipn-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${window.location.origin}/api/pesapal/ipn-callback`,
          ipnType: 'GET',
        }),
      });

      if (ipnRes.ok) {
        const ipnData = await ipnRes.json();
        paymentRequest.notificationId = ipnData.ipnId;
      }

      // Submit order
      const orderRes = await fetch('/api/pesapal/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentRequest),
      });

      if (!orderRes.ok) {
        throw new Error('Failed to create payment order');
      }

      const orderData = await orderRes.json();

      // Redirect to PesaPal
      if (orderData.redirectUrl) {
        window.location.href = orderData.redirectUrl;
      } else {
        throw new Error('No redirect URL received');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      alert(error.message || (language === 'rw' ? 'Habaye ikosa' : 'An error occurred'));
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-12 md:py-16">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  if (!plan) {
    return null;
  }

  return (
    <div className="container py-12 md:py-16 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">{t('checkout.title', language)}</h1>

      {/* Plan Summary */}
      <div className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 mb-8">
        <div className="text-sm text-muted mb-2">{t('checkout.selectedPlan', language)}</div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xl font-bold">{language === 'rw' ? plan.display_name_rw : plan.display_name_en}</div>
            <div className="text-sm text-muted">
              {plan.duration_months} {plan.duration_months === 1 ? t('common.month', language) : t('common.months', language)}
            </div>
          </div>
          <div className="text-2xl font-bold">{plan.price_rwf.toLocaleString()} RWF</div>
        </div>
        <ul className="text-sm space-y-2">
          {(language === 'rw' ? plan.features_rw : plan.features_en).slice(0, 3).map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span className="text-muted">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Payment Method */}
      <div className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 mb-8">
        <div className="text-lg font-semibold mb-4">{t('checkout.paymentMethod', language)}</div>
        
        <div className="grid grid-cols-3 gap-3 mb-6">
          {(['airtel', 'mtn', 'card'] as const).map((method) => (
            <button
              key={method}
              onClick={() => setPaymentMethod(method)}
              className={`p-4 rounded-lg border-2 transition ${
                paymentMethod === method
                  ? 'border-primary bg-primary/10'
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              <div className="text-sm font-semibold capitalize">{method === 'card' ? 'Card' : method}</div>
            </button>
          ))}
        </div>

        {paymentMethod !== 'card' && (
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('checkout.phoneNumber', language)}
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="078XXXXXXX"
              className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 focus:border-primary focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => router.back()}
          disabled={processing}
          className="flex-1 px-6 py-3 rounded-lg bg-white/5 text-white font-semibold hover:bg-white/10 transition disabled:opacity-50"
        >
          {t('common.cancel', language)}
        </button>
        <button
          onClick={handlePayment}
          disabled={processing || (paymentMethod !== 'card' && !phoneNumber)}
          className="flex-1 px-6 py-3 rounded-lg bg-primary text-black font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {processing ? t('checkout.processing', language) : t('checkout.payNow', language)}
        </button>
      </div>
    </div>
  );
}
