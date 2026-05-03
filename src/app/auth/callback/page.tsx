"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        // If already logged in, go to dashboard
        const { data: existing } = await supabase.auth.getSession();
        if (existing.session) {
          router.replace('/dashboard');
          return;
        }

        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const errorDesc = url.searchParams.get('error_description');

        if (errorDesc) {
          setError(errorDesc);
          return;
        }

        if (!code) {
          setError('Missing authorization code.');
          return;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError(error.message);
          return;
        }

        router.replace('/dashboard');
      } catch (e: any) {
        setError(e?.message || 'Authentication failed.');
      }
    };
    run();
  }, [router]);

  return (
    <div className="container py-12 md:py-16 max-w-md">
      <h1 className="text-2xl font-bold mb-2">Signing you in…</h1>
      {!error && <p className="text-muted">Please wait…</p>}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          <div className="font-semibold mb-1">Google sign-in failed</div>
          <div className="text-sm mb-3">{error}</div>
          <button onClick={() => window.location.assign('/login')} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">
            Back to Login
          </button>
        </div>
      )}
    </div>
  );
}
