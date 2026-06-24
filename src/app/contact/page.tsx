"use client";
import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/i18n';

export default function ContactPage() {
  const { language } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: any) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.includes('@') || !message.trim()) {
      setError('Please fill all fields with a valid email');
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus('success');
      setName(''); setEmail(''); setMessage('');
      setTimeout(() => setStatus('idle'), 4000);
    } catch (e: any) {
      setStatus('error');
      setError(e?.message || 'Failed to send');
    }
  };
  return (
    <div className="container py-12 md:py-16 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">{t('contact.title', language)}</h1>
      <p className="text-muted mb-8">{t('contact.subtitle', language)}</p>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm mb-1">{t('contact.name', language)}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md bg-[var(--surface)] border border-white/10 px-3 py-2" placeholder="Your name" />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('auth.email', language)}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md bg-[var(--surface)] border border-white/10 px-3 py-2" placeholder="you@example.com" />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('contact.message', language)}</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full rounded-md bg-[var(--surface)] border border-white/10 px-3 py-2 min-h-[120px]" placeholder="How can we help?" />
        </div>
        <button type="submit" disabled={status==='loading'} className="px-4 py-2 rounded-md bg-primary text-black font-semibold hover:opacity-90 disabled:opacity-50">{status==='loading' ? 'Sending…' : t('contact.send', language)}</button>
        {status==='success' && <div className="text-green-400 text-sm mt-2">Message sent!</div>}
        {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
      </form>
    </div>
  );
}
