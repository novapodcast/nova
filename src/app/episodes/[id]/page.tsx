"use client";
import { useLanguage } from '../../../contexts/LanguageContext';
import { t } from '../../../lib/i18n';

interface Props { params: { id: string } }

export default function EpisodeDetailPage({ params }: Props) {
  const { language } = useLanguage();
  return (
    <div className="container py-12 md:py-16">
      <h1 className="text-3xl font-bold mb-2">{t('episodes.episode', language)}</h1>
      <p className="text-muted">Details for episode ID: <span className="text-white font-mono">{params.id}</span> will appear here.</p>
    </div>
  );
}
