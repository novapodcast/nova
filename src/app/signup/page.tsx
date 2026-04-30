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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
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
          const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
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
