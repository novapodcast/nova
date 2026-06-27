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
    <div className="container py-12 md:py-20 max-w-2xl animate-fade-in-up">
      <h1 className="text-3xl font-bold mb-2">{t('contact.title', language)}</h1>
      <p className="text-muted mb-8">{t('contact.subtitle', language)}</p>

      <form className="space-y-5 bg-[var(--surface)] rounded-2xl p-8 ring-1 ring-white/5" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm mb-1.5 font-medium">{t('contact.name', language)}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg bg-black/30 border border-white/10 px-4 py-2.5 text-white placeholder-white/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" placeholder="Your name" />
        </div>
        <div>
          <label className="block text-sm mb-1.5 font-medium">{t('auth.email', language)}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg bg-black/30 border border-white/10 px-4 py-2.5 text-white placeholder-white/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" placeholder="you@example.com" />
        </div>
        <div>
          <label className="block text-sm mb-1.5 font-medium">{t('contact.message', language)}</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full rounded-lg bg-black/30 border border-white/10 px-4 py-2.5 text-white placeholder-white/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition min-h-[140px] resize-y" placeholder="How can we help?" />
        </div>
        <button type="submit" disabled={status==='loading'} className="px-6 py-2.5 rounded-lg bg-primary text-black font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">{status==='loading' ? 'Sending…' : t('contact.send', language)}</button>
        {status==='success' && <div className="text-green-400 text-sm p-3 rounded-lg bg-green-500/10 border border-green-500/20 animate-fade-in-up">✓ Message sent! We'll get back to you soon.</div>}
        {error && <div className="text-red-400 text-sm p-3 rounded-lg bg-red-500/10 border border-red-500/20">{error}</div>}
      </form>
    </div>
  );
}
