"use client";
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/i18n';

export default function PrivacyPage() {
  const { language } = useLanguage();
  return (
    <div className="container py-12 md:py-16 prose prose-invert max-w-3xl">
      <h1>{t('privacy.title', language)}</h1>
      <p>{t('privacy.placeholder', language)}</p>
    </div>
  );
}
