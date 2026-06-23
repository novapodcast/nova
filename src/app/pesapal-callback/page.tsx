"use client";
import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function PesapalCallbackAlias() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const sp = new URLSearchParams();
    const keys = ['OrderTrackingId', 'orderTrackingId'];
    for (const k of keys) {
      const v = searchParams?.get(k);
      if (v) sp.set(k, v);
    }
    router.replace(`/payment-callback?${sp.toString()}`);
  }, [searchParams, router]);

  return null;
}
