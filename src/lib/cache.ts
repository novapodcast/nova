type CacheEntry<T> = { v: T; e: number };

export function setCache<T>(key: string, value: T, ttlMs: number) {
  try {
    const entry: CacheEntry<T> = { v: value, e: Date.now() + ttlMs };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {}
}

export function getCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (!entry?.e || Date.now() > entry.e) {
      sessionStorage.removeItem(key);
      return null;
    }
    return entry.v as T;
  } catch {
    return null;
  }
}
