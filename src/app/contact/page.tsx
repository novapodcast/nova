"use client";
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/i18n';

export default function ContactPage() {
  const { language } = useLanguage();
  return (
    <div className="container py-12 md:py-16 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">{t('contact.title', language)}</h1>
      <p className="text-muted mb-8">{t('contact.subtitle', language)}</p>

      <form className="space-y-4">
        <div>
          <label className="block text-sm mb-1">{t('contact.name', language)}</label>
          <input className="w-full rounded-md bg-[var(--surface)] border border-white/10 px-3 py-2" placeholder="Your name" />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('auth.email', language)}</label>
          <input type="email" className="w-full rounded-md bg-[var(--surface)] border border-white/10 px-3 py-2" placeholder="you@example.com" />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('contact.message', language)}</label>
          <textarea className="w-full rounded-md bg-[var(--surface)] border border-white/10 px-3 py-2 min-h-[120px]" placeholder="How can we help?" />
        </div>
        <button type="button" className="px-4 py-2 rounded-md bg-primary text-black font-semibold hover:opacity-90">{t('contact.send', language)}</button>
      </form>
    </div>
  );
}
