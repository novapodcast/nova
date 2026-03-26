"use client";
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/i18n';

export default function TermsPage() {
  const { language } = useLanguage();
  return (
    <div className="container py-12 md:py-16 prose prose-invert max-w-3xl">
      <h1>{t('terms.title', language)}</h1>
      <p>{t('terms.placeholder', language)}</p>
    </div>
  );
}
