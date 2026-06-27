"use client";
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center animate-fade-in-up">
      <div className="container py-20 text-center">
        <div className="mx-auto max-w-xl">
          <div className="text-8xl mb-4 opacity-80">🛰️</div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">404</h1>
          <p className="text-lg text-muted mb-8">The page you are looking for doesn’t exist or has moved.</p>
          <div className="flex items-center gap-3 justify-center">
            <Link href="/" className="px-5 py-2.5 rounded-lg bg-primary text-black font-semibold hover:opacity-90 transition-opacity">Go Home</Link>
            <Link href="/episodes" className="px-5 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">Browse Episodes</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
