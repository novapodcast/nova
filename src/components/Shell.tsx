'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext';
import { t } from '../lib/i18n';
import LanguageSwitcher from './LanguageSwitcher';
import { setConsentFromBanner, track } from '../lib/analytics';
import { COOKIE_CONSENT_KEY } from '../lib/constants';
import { supabase } from '../lib/supabaseClient';

function Header() {
  const router = useRouter();
  const { language } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setUserEmail(data.session?.user?.email ?? null);
      } catch {
      }
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUserEmail(null);
      router.push('/');
    }
  };

  return (
    <header className="w-full bg-black/60 backdrop-blur sticky top-0 z-50 border-b border-white/5">
      <div className="container flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2 group" aria-label="Nova home">
          <img src="/favicon.svg" alt="Nova" className="h-7 w-7 transition-transform group-hover:scale-110" />
          <span className="text-xl font-bold text-white tracking-tight">Nova</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-white/10"
          aria-label="Open menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted">
          <Link href="/podcasts" className="hover:text-white">{t('nav.podcasts', language)}</Link>
          <Link href="/search" className="hover:text-white">{language === 'rw' ? 'Shakisha' : 'Search'}</Link>
          <Link href="/library" className="hover:text-white">{language === 'rw' ? 'Isomero' : 'Library'}</Link>
          <Link href="/pricing" className="hover:text-white">{t('nav.pricing', language)}</Link>
          <Link href="/about" className="hover:text-white">{t('nav.about', language)}</Link>
          <LanguageSwitcher />
          {userEmail ? (
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="px-3 py-1.5 rounded-md bg-white/5 text-white hover:bg-white/10">
                {t('nav.dashboard', language)}
              </Link>
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/5 text-white text-sm"
              >
                {t('common.signOut', language)}
              </button>
            </div>
          ) : (
            <Link href="/login" className="px-3 py-1.5 rounded-md bg-primary text-black font-semibold hover:opacity-90">
              {t('nav.signIn', language)}
            </Link>
          )}
        </nav>
      </div>
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed right-0 top-0 h-full w-72 bg-[var(--surface)] border-l border-white/10 z-[61] p-6 flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between mb-6">
              <span className="text-lg font-semibold text-white">Menu</span>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-2 text-white hover:bg-white/10"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <nav className="flex flex-col gap-4 text-base text-muted">
              <Link href="/podcasts" className="hover:text-white" onClick={() => setMobileOpen(false)}>
                {t('nav.podcasts', language)}
              </Link>
              <Link href="/search" className="hover:text-white" onClick={() => setMobileOpen(false)}>
                {language === 'rw' ? 'Shakisha' : 'Search'}
              </Link>
              <Link href="/library" className="hover:text-white" onClick={() => setMobileOpen(false)}>
                {language === 'rw' ? 'Isomero' : 'Library'}
              </Link>
              <Link href="/pricing" className="hover:text-white" onClick={() => setMobileOpen(false)}>
                {t('nav.pricing', language)}
              </Link>
              <Link href="/about" className="hover:text-white" onClick={() => setMobileOpen(false)}>
                {t('nav.about', language)}
              </Link>
              <div className="pt-2">
                <LanguageSwitcher />
              </div>
              {userEmail ? (
                <div className="flex flex-col gap-3">
                  <Link
                    href="/dashboard"
                    className="px-3 py-2 rounded-md bg-white/5 text-white hover:bg-white/10 w-fit"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t('nav.dashboard', language)}
                  </Link>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      handleSignOut();
                    }}
                    className="px-3 py-2 rounded-md border border-white/10 text-white hover:bg-white/5 text-left"
                  >
                    {t('common.signOut', language)}
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="mt-2 px-3 py-2 rounded-md bg-primary text-black font-semibold hover:opacity-90 w-fit"
                  onClick={() => setMobileOpen(false)}
                >
                  {t('nav.signIn', language)}
                </Link>
              )}
            </nav>
          </aside>
        </>
      )}
    </header>
  );
}

function Footer() {
  const { language } = useLanguage();

  return (
    <footer className="mt-24 border-t border-white/5">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <img src="/favicon.svg" alt="Nova" className="h-6 w-6" />
              <span className="text-lg font-bold text-white">Nova</span>
            </div>
            <p className="text-sm text-muted max-w-sm leading-relaxed">{language === 'rw' ? 'Podcasts zituma ubuzima bwawe buhinduka, zivuga mu rurimi rwawe.' : 'Podcasts that transform your life, spoken in your language.'}</p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-white/80 mb-3">{language === 'rw' ? 'Ibyerekeye' : 'Explore'}</div>
            <div className="flex flex-col gap-2 text-sm text-muted">
              <Link href="/podcasts" className="hover:text-white transition-colors">{t('nav.podcasts', language)}</Link>
              <Link href="/pricing" className="hover:text-white transition-colors">{t('nav.pricing', language)}</Link>
              <Link href="/about" className="hover:text-white transition-colors">{t('nav.about', language)}</Link>
              <Link href="/contact" className="hover:text-white transition-colors">{t('nav.contact', language)}</Link>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-white/80 mb-3">{language === 'rw' ? 'Amategeko' : 'Legal'}</div>
            <div className="flex flex-col gap-2 text-sm text-muted">
              <Link href="/terms" className="hover:text-white transition-colors">{t('footer.terms', language)}</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">{t('footer.privacy', language)}</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted">
          <p>{t('footer.copyright', language, { year: new Date().getFullYear() })}</p>
          <div className="flex items-center gap-3">
            <a href="https://twitter.com/novapodcast" target="_blank" rel="noopener noreferrer" aria-label="X" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-xs font-bold">X</a>
            <a href="https://instagram.com/novapodcast" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-xs font-bold">IG</a>
            <a href="https://facebook.com/novapodcast" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-xs font-bold">FB</a>
            <a href="https://youtube.com/@novapodcast" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-xs font-bold">YT</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<'unknown' | 'accepted' | 'rejected'>('unknown');

  useEffect(() => {
    try {
      const v = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (v === 'accepted' || v === 'rejected') setConsent(v);
    } catch {}
  }, []);

  const accept = () => {
    try { localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted'); } catch {}
    setConsent('accepted');
    try { setConsentFromBanner('accepted'); track('consent_accept'); } catch {}
  };
  const reject = () => {
    try { localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected'); } catch {}
    setConsent('rejected');
    try { setConsentFromBanner('rejected'); track('consent_reject'); } catch {}
  };

  return (
    <LanguageProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-black focus:rounded-lg focus:font-medium"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="zoom-75">{children}</main>
      {/* WhatsApp Chat Button */}
      <a
        href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ''}?text=${encodeURIComponent('Hi Nova team 👋, I need some help.')}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-[#25D366] shadow-lg flex items-center justify-center hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/20"
      >
        <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true" fill="#000">
          <path d="M19.11 17.27c-.3-.16-1.77-.88-2.05-.98-.27-.1-.47-.16-.67.16-.2.32-.77.98-.95 1.18-.17.2-.35.22-.64.08-.3-.16-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.67-2.06-.17-.3-.02-.47.13-.63.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.53-.07-.16-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.5-.17 0-.37-.02-.57-.02-.2 0-.53.08-.8.37-.27.3-1.05 1.03-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.12 3.23 5.14 4.53.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.41.25-.69.25-1.28.18-1.41-.07-.13-.27-.2-.57-.35z"/>
          <path d="M26.7 5.3C24.2 2.8 20.9 1.5 17.5 1.5 9.7 1.5 3.4 7.8 3.4 15.6c0 2.5.7 4.9 2 7l-1.3 4.8 4.9-1.3c2 1.1 4.3 1.7 6.6 1.7h0c7.8 0 14.1-6.3 14.1-14.1 0-3.4-1.3-6.7-3.6-9zM17.6 25.5h0c-2.1 0-4.2-.6-6-1.6l-.4-.2-2.9.8.8-2.9-.2-.4c-1.1-1.8-1.6-3.8-1.6-5.9 0-6.2 5.1-11.3 11.3-11.3 3 0 5.8 1.2 8 3.3 2.1 2.1 3.3 5 3.3 8 0 6.2-5.1 11.2-11.3 11.2z"/>
        </svg>
      </a>
      {consent === 'unknown' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] md:w-[720px]">
          <div className="bg-[var(--surface)] border border-white/10 rounded-xl p-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
              <div className="text-sm text-muted">
                We use minimal cookies to improve your experience. See our <a className="underline" href="/privacy">Privacy</a> and <a className="underline" href="/terms">Terms</a>.
              </div>
              <div className="flex items-center gap-2">
                <button onClick={reject} className="px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/5 text-sm">Decline</button>
                <button onClick={accept} className="px-3 py-1.5 rounded-md bg-primary text-black font-semibold hover:opacity-90 text-sm">Allow</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </LanguageProvider>
  );
}
