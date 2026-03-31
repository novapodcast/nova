'use client';

import Link from 'next/link';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="container py-16">
      <h1 className="text-2xl md:text-3xl font-bold text-white">Admin page error</h1>
      <p className="mt-3 text-muted">Please try again.</p>
      <div className="mt-6 flex gap-3">
        <button onClick={() => reset()} className="px-4 py-2 rounded-md bg-primary text-black font-semibold hover:opacity-90">Retry</button>
        <Link href="/" className="px-4 py-2 rounded-md border border-white/10 hover:border-white/30">Go Home</Link>
      </div>
    </div>
  );
}
