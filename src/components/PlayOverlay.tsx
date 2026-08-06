"use client";
import React from 'react';

interface PlayOverlayProps {
  size?: number; // diameter in px
  className?: string;
}

export default function PlayOverlay({ size = 40, className = '' }: PlayOverlayProps) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${className}`}>
      <div
        className="opacity-0 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        aria-hidden="true"
      >
        <div
          className="rounded-full bg-black/60 text-white flex items-center justify-center shadow-md"
          style={{ width: size, height: size }}
        >
          <svg width={Math.round(size * 0.45)} height={Math.round(size * 0.45)} viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
