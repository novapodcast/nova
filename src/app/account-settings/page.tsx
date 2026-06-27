import { Suspense } from 'react';
import AccountSettings from '../../components/AccountSettings';

export default function AccountSettingsPage() {
  return (
    <Suspense fallback={
      <div className="container py-12 md:py-16">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="h-6 w-64 bg-white/5 rounded animate-pulse" />
          <div className="h-10 w-48 bg-white/5 rounded animate-pulse" />
          <div className="bg-[var(--surface)] rounded-xl h-96 animate-pulse" />
        </div>
      </div>
    }>
      <AccountSettings />
    </Suspense>
  );
}
