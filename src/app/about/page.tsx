"use client";
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/i18n';

export default function AboutPage() {
  const { language } = useLanguage();
  return (
    <div className="container py-12 md:py-16 prose prose-invert max-w-3xl">
      <h1>{t('about.title', language)}</h1>
      <p>{t('about.description', language)}</p>
      <p>{t('about.mission', language)}</p>
    </div>
  );
}
