"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ActivateAdminPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'working' | 'ok' | 'error'>('working');
  const [message, setMessage] = useState<string>('Preparing…');

  useEffect(() => {
    const run = async () => {
      try {
        setMessage('Checking your session…');
        const { data: s } = await supabase.auth.getSession();
        const token = s.session?.access_token;
        if (!token) {
          setStatus('error');
          setMessage('You are not signed in. Please log in first.');
          return;
        }

        setMessage('Finalizing admin setup…');
        const res = await fetch('/api/admin/users/promote-self', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `Request failed (${res.status})`);
        }

        setStatus('ok');
        setMessage('Success! Redirecting to Admin…');
        setTimeout(() => router.replace('/admin/pricing'), 800);
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.message || 'Something went wrong.');
      }
    };
    run();
  }, [router]);

  return (
    <div className="container py-12 md:py-16 max-w-md">
      <h1 className="text-2xl font-bold mb-2">Admin Activation</h1>
      <div className={`p-4 rounded-lg ${status === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-white/5 border border-white/10 text-white/80'}`}>
        {message}
      </div>
      <div className="mt-4 text-sm text-muted">If this fails, make sure you are signed in with the correct email.</div>
    </div>
  );
}
