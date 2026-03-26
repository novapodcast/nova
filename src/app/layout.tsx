import type { Metadata } from 'next';
import './globals.css';
import { ReactNode } from 'react';
import Shell from '../components/Shell';

export const metadata: Metadata = {
  title: 'Nova – Podcasts that transform',
  description: 'Discover inspiring episodes, subscribe, and listen anywhere.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--background)] text-[var(--text)]">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
