'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext';
import { t } from '../lib/i18n';
import LanguageSwitcher from './LanguageSwitcher';

function Header() {
  const { language } = useLanguage();

  return (
    <header className="w-full bg-black/60 backdrop-blur sticky top-0 z-50 border-b border-white/5">
      <div className="container flex items-center justify-between py-4">
        <Link href="/" className="text-xl font-bold text-white">Nova</Link>
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
