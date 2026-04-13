import type { Metadata } from 'next';
import './globals.css';
import { ReactNode } from 'react';
import Shell from '../components/Shell';

export const metadata: Metadata = {
  title: 'Nova – Podcasts that transform',
  description: 'Discover inspiring episodes, subscribe, and listen anywhere.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', sizes: '96x96' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/site.webmanifest',
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
