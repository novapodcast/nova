"use client";
import { getTierName, hasAccess } from '@/lib/entitlements';

interface ContentTierBadgeProps {
  contentTierRank: number;
  userTierRank?: number;
  language: 'rw' | 'en';
  className?: string;
}

export default function ContentTierBadge({ contentTierRank, userTierRank = 0, language, className = '' }: ContentTierBadgeProps) {
  const tierName = getTierName(contentTierRank, language);
  const locked = !hasAccess(userTierRank, contentTierRank) && contentTierRank > 0;

  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap';
  const palette = contentTierRank === 0
    ? 'bg-white/5 text-muted ring-1 ring-white/10'
    : locked
      ? 'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20'
      : 'bg-primary/10 text-primary ring-1 ring-primary/20';

  return (
    <span className={`${base} ${palette} ${className}`}>
      {contentTierRank > 0 && (
        locked ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0v4m-9 0h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2z" />
          </svg>
        )
      )}
      {tierName}
    </span>
  );
}
