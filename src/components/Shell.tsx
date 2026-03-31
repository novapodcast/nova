'use client';

import Link from 'next/link';
import { ReactNode, useState } from 'react';
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext';
import { t } from '../lib/i18n';
import LanguageSwitcher from './LanguageSwitcher';

function Header() {
  const { language } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="w-full bg-black/60 backdrop-blur sticky top-0 z-50 border-b border-white/5">
      <div className="container flex items-center justify-between py-4">
        <Link href="/" className="text-xl font-bold text-white">Nova</Link>
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
          <Link href="/episodes" className="hover:text-white">{t('nav.episodes', language)}</Link>
          <Link href="/pricing" className="hover:text-white">{t('nav.pricing', language)}</Link>
          <Link href="/about" className="hover:text-white">{t('nav.about', language)}</Link>
          <LanguageSwitcher />
          <Link href="/login" className="px-3 py-1.5 rounded-md bg-primary text-black font-semibold hover:opacity-90">
            {t('nav.signIn', language)}
          </Link>
        </nav>
      </div>
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed right-0 top-0 h-full w-72 bg-[var(--surface)] border-l border-white/10 z-[61] p-6 flex flex-col">
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
              <Link href="/episodes" className="hover:text-white" onClick={() => setMobileOpen(false)}>
                {t('nav.episodes', language)}
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
              <Link
                href="/login"
                className="mt-2 px-3 py-2 rounded-md bg-primary text-black font-semibold hover:opacity-90 w-fit"
                onClick={() => setMobileOpen(false)}
              >
                {t('nav.signIn', language)}
              </Link>
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
      <div className="container py-10 text-sm text-muted flex flex-col md:flex-row items-center justify-between gap-4">
        <p>{t('footer.copyright', language, { year: new Date().getFullYear() })}</p>
        <div className="flex items-center gap-6">
          <Link href="/terms" className="hover:text-white">{t('footer.terms', language)}</Link>
          <Link href="/privacy" className="hover:text-white">{t('footer.privacy', language)}</Link>
        </div>
      </div>
    </footer>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <Header />
      <main>{children}</main>
      <Footer />
    </LanguageProvider>
  );
}
