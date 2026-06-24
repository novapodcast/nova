'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabaseClient';
import { isAdminEmail } from './admin';

export function useAdminGuard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;
    const verify = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!active) return;
      const email = userData.user?.email ?? null;
      if (!email) { router.replace('/login'); return; }

      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { router.replace('/login'); return; }

      try {
        const res = await fetch('/api/admin/guard', { headers: { Authorization: `Bearer ${token}` } });
        if (!active) return;
        if (res.ok) {
          setAuthorized(true);
        } else {
          router.replace('/dashboard');
          return;
        }
      } catch {
        if (!active) return;
        if (isAdminEmail(email)) {
          setAuthorized(true);
        } else {
          router.replace('/dashboard');
          return;
        }
      }
      setLoading(false);
    };
    verify();
    return () => { active = false; };
  }, [router]);

  return { loading, authorized };
}
