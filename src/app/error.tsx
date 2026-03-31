'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {}, [error]);
  return (
    <div className="container py-20">
      <h1 className="text-2xl md:text-3xl font-bold text-white">Something went wrong</h1>
      <p className="mt-3 text-muted">An unexpected error occurred.</p>
      <div className="mt-6 flex gap-3">
        <button onClick={() => reset()} className="px-4 py-2 rounded-md bg-primary text-black font-semibold hover:opacity-90">Retry</button>
        <Link href="/" className="px-4 py-2 rounded-md border border-white/10 hover:border-white/30">Go Home</Link>
      </div>
    </div>
  );
}
