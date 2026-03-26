'use client';

import { useLanguage } from '../contexts/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 bg-white/5 rounded-full p-1">
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
          language === 'en'
            ? 'bg-primary text-black'
            : 'text-muted hover:text-white'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('rw')}
        className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
          language === 'rw'
            ? 'bg-primary text-black'
            : 'text-muted hover:text-white'
        }`}
      >
        RW
      </button>
    </div>
  );
}
