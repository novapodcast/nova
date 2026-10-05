"use client";
import { useEffect, useState } from 'react';

export function useSubscriptionCountdown(expiresAt: string | null | undefined): string | null {
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!expiresAt) { setCountdown(null); return; }
    const update = () => {
      const end = new Date(expiresAt).getTime();
      const now = Date.now();
      const diff = end - now;
      if (isNaN(end) || diff <= 0) { setCountdown('00d 00h 00m'); return; }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setCountdown(`${String(d).padStart(2, '0')}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`);
    };
    update();
    const id = setInterval(update, 60 * 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return countdown;
}
