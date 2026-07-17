'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/contexts/LanguageContext';

interface ConsentType {
  id: string;
  code: string;
  display_name_en: string;
  display_name_rw: string;
  is_required: boolean;
  is_toggle: boolean;
  description_en: string | null;
  description_rw: string | null;
  accepted: boolean;
}

export default function TermsOnboarding() {
  const router = useRouter();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [consents, setConsents] = useState<ConsentType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState<string | null>(null);

  useEffect(() => {
    checkConsents();
  }, []);

  const checkConsents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      const res = await fetch('/api/consent', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        setError('Failed to load consent requirements');
        setLoading(false);
        return;
      }

      const data = await res.json();
      const consentList = data.consents as ConsentType[];
      setConsents(consentList);

      // Check if all required consents are already accepted
      const required = consentList.filter(c => c.is_required);
      const allAccepted = required.every(c => c.accepted);

      if (allAccepted) {
        // User already accepted, redirect to dashboard
        router.replace('/dashboard');
        return;
      }

      setLoading(false);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
      setLoading(false);
    }
  };

  const toggleConsent = (id: string) => {
    setConsents(prev => prev.map(c =>
      c.id === id ? { ...c, accepted: !c.accepted } : c
    ));
  };

  const handleAccept = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      // Validate required consents
      const required = consents.filter(c => c.is_required);
      const allRequiredAccepted = required.every(c => c.accepted);

      if (!allRequiredAccepted) {
        setError(language === 'rw'
          ? 'Ugomba kwemera amategeko yose agenwa.'
          : 'You must accept all required terms to continue.');
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          consents: consents.map(c => ({
            consent_type_id: c.id,
            accepted: c.accepted,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to save consents');
        setSubmitting(false);
        return;
      }

      router.replace('/dashboard');
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted">Loading…</div>
      </div>
    );
  }

  const t = (en: string, rw: string) => language === 'rw' ? rw : en;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center">
            <span className="text-3xl">🎙️</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {t('Welcome to Nova', 'Murakaza neza kuri Nova')}
          </h1>
          <p className="text-muted text-sm">
            {t('Before you start, please review and accept our terms.', 'Ntibereho, reba wemere amategeko yacu.')}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="bg-[var(--surface)] rounded-2xl p-6 ring-1 ring-white/5 space-y-5">
          {/* Required consents */}
          {consents.filter(c => c.is_required && c.is_toggle).map((c) => (
            <div key={c.id}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={c.accepted}
                  onChange={() => toggleConsent(c.id)}
                  className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {language === 'rw' ? c.display_name_rw : c.display_name_en}
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">
                      {t('Required', 'Byemewe')}
                    </span>
                  </div>
                  <p className="text-sm text-muted mt-1">
                    {language === 'rw' ? c.description_rw : c.description_en}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowTerms(showTerms === c.code ? null : c.code)}
                    className="text-xs text-primary hover:underline mt-2"
                  >
                    {showTerms === c.code ? t('Hide', 'Hisha') : t('Read full document', 'Soma inyandiko yose')}
                  </button>
                </div>
              </label>
            </div>
          ))}

          {/* Informational acknowledgement (personalized) */}
          {consents.filter(c => !c.is_toggle).map((c) => (
            <div key={c.id} className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">ℹ️</span>
                <span className="font-semibold text-white">
                  {language === 'rw' ? c.display_name_rw : c.display_name_en}
                </span>
              </div>
              <p className="text-sm text-muted">
                {language === 'rw' ? c.description_rw : c.description_en}
              </p>
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={c.accepted}
                  onChange={() => toggleConsent(c.id)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                />
                <span className="text-sm text-muted">
                  {t('I acknowledge this information', 'Nemera ibyo bimenyetso')}
                </span>
              </label>
            </div>
          ))}

          {/* Optional toggles */}
          {consents.filter(c => !c.is_required && c.is_toggle).length > 0 && (
            <div className="border-t border-white/10 pt-5">
              <h3 className="text-sm font-semibold text-muted mb-4">
                {t('Optional Preferences', 'Ibyifuzo Bitari Ngombwa')}
              </h3>
              {consents.filter(c => !c.is_required && c.is_toggle).map((c) => (
                <div key={c.id} className="mb-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={c.accepted}
                      onChange={() => toggleConsent(c.id)}
                      className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-white text-sm">
                        {language === 'rw' ? c.display_name_rw : c.display_name_en}
                      </span>
                      <p className="text-xs text-muted mt-1">
                        {language === 'rw' ? c.description_rw : c.description_en}
                      </p>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleAccept}
            disabled={submitting}
            className="w-full py-3 bg-primary text-black font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-50"
          >
            {submitting
              ? t('Saving…', 'Bika…')
              : t('Continue to Nova', 'Komeza kuri Nova')}
          </button>
        </div>

        <p className="text-center text-xs text-muted mt-6">
          {t('You can change your preferences anytime in Settings.', 'Ushobora guhindura ibyifuzo byawe igihe cyose muri Settings.')}
        </p>
      </div>
    </div>
  );
}
