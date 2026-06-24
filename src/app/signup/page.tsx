"use client";
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/i18n';

export default function SignupPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);

  const handleGoogleSignUp = async () => {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      },
    });
    setLoading(false);
    if (error) setError(error.message);
  };

  return (
    <div className="container py-12 md:py-16 max-w-md">
      <h1 className="text-3xl font-bold mb-2">{t('auth.createAccount', language)}</h1>
      <p className="text-muted mb-8">{t('auth.joinNova', language)}</p>

      <div className="flex items-start gap-2 mb-4">
        <input
          id="agree"
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5"
        />
        <label htmlFor="agree" className="text-xs text-muted">
          {t('auth.agreePrefix', language)}{' '}
          <Link href="/terms" className="underline">{t('footer.terms', language)}</Link>{' '}
          {t('auth.and', language)}{' '}
          <Link href="/privacy" className="underline">{t('footer.privacy', language)}</Link>.
        </label>
      </div>

      <button
        onClick={handleGoogleSignUp}
        className="w-full px-4 py-3 rounded-md bg-primary text-black font-semibold hover:opacity-90 disabled:opacity-60 mb-4"
        disabled={loading || !agree}
      >
        {loading ? t('auth.signingUp', language) : t('auth.continueWithGoogle', language)}
      </button>

      {error && <div className="text-red-400 text-sm mb-4">{error}</div>}

      <p className="text-sm text-muted mt-4">{t('auth.haveAccount', language)} <Link className="text-primary" href="/login">{t('auth.signInHere', language)}</Link></p>
    </div>
  );
}
