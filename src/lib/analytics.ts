'use client';
import { COOKIE_CONSENT_KEY as CONSENT_KEY } from './constants';

type EventPayload = {
  event: string;
  properties?: Record<string, any>;
  ts?: number;
  userId?: string | null;
  device?: string | null;
  platform?: string | null;
};

let consent: 'accepted' | 'rejected' | 'unknown' = 'unknown';
let queue: EventPayload[] = [];

function readConsent() {
  if (typeof window === 'undefined') return;
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    if (v === 'accepted' || v === 'rejected') consent = v;
  } catch {}
}

readConsent();

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === CONSENT_KEY) {
      const v = e.newValue as any;
      if (v === 'accepted' || v === 'rejected') {
        consent = v;
        if (consent === 'accepted') flush();
      }
    }
  });
}

export function setConsentFromBanner(v: 'accepted' | 'rejected') {
  consent = v;
  if (consent === 'accepted') flush();
}

export function canTrack() {
  return consent === 'accepted';
}

async function send(payload: EventPayload) {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, ts: payload.ts || Date.now(), platform: 'web' }),
      keepalive: true,
    });
  } catch {}
}

function flush() {
  if (!canTrack() || typeof window === 'undefined') return;
  const items = queue;
  queue = [];
  items.forEach((p) => send(p));
}

export function track(event: string, properties?: Record<string, any>) {
  const payload: EventPayload = { event, properties };
  if (!canTrack()) {
    queue.push(payload);
    return;
  }
  send(payload);
}
