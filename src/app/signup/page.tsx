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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setTermsError(false);

    if (!agreedToTerms) {
      setTermsError(true);
      setError('You must agree to the Terms & Conditions to create an account.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // If email confirmations are enabled, session may be null and user must confirm.
    if (!data.session) {
      setInfo('Check your email to confirm your account.');
      return;
    }
    router.push('/dashboard');
  };

  return (
    <div className="container py-12 md:py-16 max-w-md">
      <h1 className="text-3xl font-bold mb-2">{t('auth.createAccount', language)}</h1>
      <p className="text-muted mb-8">{t('auth.joinNova', language)}</p>

      <button
        onClick={async () => {
          setError(null);
          setInfo(null);
          setLoading(true);
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
            },
          });
          setLoading(false);
          if (error) setError(error.message);
        }}
        className="w-full px-4 py-2 rounded-md border border-white/10 hover:border-white/30 mb-4"
      >
        {t('auth.continueWithGoogle', language)}
      </button>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm mb-1">{t('auth.email', language)}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md bg-[var(--surface)] border border-white/10 px-3 py-2"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('auth.password', language)}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md bg-[var(--surface)] border border-white/10 px-3 py-2"
            placeholder="Choose a strong password"
            required
          />
        </div>

        {/* Terms & Conditions Checkbox */}
        <div className={`border rounded-lg p-4 ${termsError ? 'border-red-500/50 bg-red-500/5' : 'border-white/10 bg-white/5'}`}>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => {
                setAgreedToTerms(e.target.checked);
                setTermsError(false);
              }}
              className="mt-1 w-4 h-4 rounded border-white/20 bg-white/10 text-primary focus:ring-primary focus:ring-offset-0"
            />
            <span className="text-sm leading-relaxed">
              I have read and agree to Nova's{' '}
              <Link href="/terms" className="text-primary hover:underline" target="_blank">
                Terms & Conditions
              </Link>
              . By creating an account I confirm I am at least 13 years old and accept all terms stated therein.
            </span>
          </label>
          {termsError && (
            <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              You must agree to the Terms & Conditions to continue.
            </div>
          )}
        </div>

        {error && <div className="text-red-400 text-sm">{error}</div>}
        {info && <div className="text-green-400 text-sm">{info}</div>}
        <button
          type="submit"
          className="w-full px-4 py-2 rounded-md bg-primary text-black font-semibold hover:opacity-90 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? t('auth.signingUp', language) : t('auth.createAccount', language)}
        </button>
      </form>

      <p className="text-sm text-muted mt-4">{t('auth.haveAccount', language)} <Link className="text-primary" href="/login">{t('auth.signInHere', language)}</Link></p>
    </div>
  );
}
