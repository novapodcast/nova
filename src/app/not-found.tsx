"use client";
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container py-20 text-center">
      <div className="mx-auto max-w-xl">
        <div className="text-7xl mb-3">🛰️</div>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3 text-white">Page not found</h1>
        <p className="text-muted mb-8">The page you are looking for doesn’t exist or has moved.</p>
        <div className="flex items-center gap-3 justify-center">
          <Link href="/" className="px-5 py-2.5 rounded-lg bg-primary text-black font-semibold hover:opacity-90">Go Home</Link>
          <Link href="/episodes" className="px-5 py-2.5 rounded-lg border border-white/10 hover:bg-white/5">Browse Episodes</Link>
        </div>
      </div>
    </div>
  );
}
