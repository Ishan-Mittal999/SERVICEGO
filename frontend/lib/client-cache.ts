type CacheRecord<T> = {
  value: T;
  cachedAt: number;
};

const memoryCache = new Map<string, CacheRecord<unknown>>();

const now = () => Date.now();

export function readClientCache<T>(key: string, ttlMs: number): T | null {
  const memoryHit = memoryCache.get(key) as CacheRecord<T> | undefined;
  if (memoryHit && now() - memoryHit.cachedAt <= ttlMs) {
    return memoryHit.value;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CacheRecord<T>;
    if (!parsed || typeof parsed.cachedAt !== "number") {
      return null;
    }

    if (now() - parsed.cachedAt > ttlMs) {
      window.sessionStorage.removeItem(key);
      return null;
    }

    memoryCache.set(key, parsed as CacheRecord<unknown>);
    return parsed.value;
  } catch {
    return null;
  }
}

export function writeClientCache<T>(key: string, value: T): void {
  const record: CacheRecord<T> = {
    value,
    cachedAt: now(),
  };

  memoryCache.set(key, record as CacheRecord<unknown>);

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(key, JSON.stringify(record));
  } catch {
    // Ignore storage quota issues and continue with in-memory cache only.
  }
}
