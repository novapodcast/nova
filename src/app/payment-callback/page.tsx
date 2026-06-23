"use client";
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/i18n';

export default function PaymentCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const orderTrackingId = useMemo(() => searchParams?.get('OrderTrackingId') || searchParams?.get('orderTrackingId'), [searchParams]);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'success' | 'pending' | 'failed'>('pending');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let timer: any;
    let attempts = 0;
    const checkStatus = async () => {
      if (!orderTrackingId) {
        setStatus('failed');
        setMessage(language === 'rw' ? 'Nta makuru y\'ubwishyu yabonetse' : 'No payment information found');
        setLoading(false);
        return;
      }

      try {
        // Check payment status via API
        const res = await fetch(`/api/pesapal/status?orderTrackingId=${encodeURIComponent(orderTrackingId)}`);
        
        if (res.ok) {
          const data = await res.json();
          const statusDesc = (data.paymentStatusDescription || '').toUpperCase();

          if (statusDesc.includes('COMPLETED') || statusDesc.includes('SUCCESS')) {
            setStatus('success');
            setMessage(language === 'rw' ? 'Ubwishyu bwawe bwagenze neza!' : 'Payment completed successfully!');
            setLoading(false);
            return;
          } else if (statusDesc.includes('FAILED') || statusDesc.includes('INVALID')) {
            setStatus('failed');
            setMessage(language === 'rw' ? 'Ubwishyu ntibwagenze neza. Gerageza ukundi.' : 'Payment failed. Please try again.');
            setLoading(false);
            return;
          } else {
            setStatus('pending');
            setMessage(language === 'rw' ? 'Ubwishyu burakomeza gutunganywa...' : 'Payment is being processed...');
          }
        } else {
          setStatus('pending');
          setMessage(language === 'rw' ? 'Ubwishyu bwakirwe. Tuzakumenyesha iyo bwemejwe.' : 'Payment received. We will notify you once confirmed.');
        }
      } catch (error) {
        setStatus('pending');
        setMessage(language === 'rw' ? 'Ubwishyu bwakirwe. Tuzakumenyesha iyo bwemejwe.' : 'Payment received. We will notify you once confirmed.');
      }

      attempts += 1;
      if (attempts < 6) {
        timer = setTimeout(checkStatus, 10000); // poll every 10s up to 60s
      } else {
        setLoading(false);
      }
    };

    checkStatus();
    // Try to deep-link back to the mobile app best-effort
    try {
      const url = `nova://pesapal-callback?orderTrackingId=${encodeURIComponent(orderTrackingId || '')}`;
      // on mobile browsers this may succeed; ignore errors
      if (orderTrackingId) {
        setTimeout(() => {
          window.location.href = url;
        }, 300);
      }
    } catch {}

    return () => timer && clearTimeout(timer);
  }, [orderTrackingId, language]);

  if (loading) {
    return (
      <div className="container py-12 md:py-16 max-w-2xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted">{t('checkout.checkingStatus', language)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-16 max-w-2xl">
      <div className="bg-[var(--surface)] rounded-xl p-8 ring-1 ring-white/5 text-center">
        {status === 'success' && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold mb-2">{t('checkout.paymentSuccess', language)}</h1>
            <p className="text-muted mb-6">{message}</p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/dashboard"
                className="px-6 py-3 rounded-lg bg-primary text-black font-semibold hover:opacity-90 transition"
              >
                {t('common.viewDashboard', language)}
              </Link>
              <Link
                href="/episodes"
                className="px-6 py-3 rounded-lg bg-white/5 text-white font-semibold hover:bg-white/10 transition"
              >
                {t('dashboard.browseEpisodes', language)}
              </Link>
            </div>
          </>
        )}

        {status === 'pending' && (
          <>
            <div className="text-6xl mb-4">⏳</div>
            <h1 className="text-2xl font-bold mb-2">{t('checkout.paymentPending', language)}</h1>
            <p className="text-muted mb-6">{message}</p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 rounded-lg bg-primary text-black font-semibold hover:opacity-90 transition"
            >
              {t('common.viewDashboard', language)}
            </Link>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold mb-2">{t('checkout.paymentFailed', language)}</h1>
            <p className="text-muted mb-6">{message}</p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/pricing"
                className="px-6 py-3 rounded-lg bg-primary text-black font-semibold hover:opacity-90 transition"
              >
                {t('common.tryAgain', language)}
              </Link>
              <Link
                href="/dashboard"
                className="px-6 py-3 rounded-lg bg-white/5 text-white font-semibold hover:bg-white/10 transition"
              >
                {t('common.viewDashboard', language)}
              </Link>
            </div>
          </>
        )}

        {orderTrackingId && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-muted">
              {t('checkout.orderId', language)}: {orderTrackingId}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
