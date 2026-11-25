import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

/**
 * Tiny stale-while-revalidate cache (no extra dependency).
 * - Persists to localStorage so the app opens instantly and works offline.
 * - Re-fetches on focus / reconnect and polls while visible so you both stay in sync.
 */
export interface Entry<T = unknown> {
  data?: T;
  error?: Error;
  loading: boolean;
  fetchedAt: number;
}

const PREFIX = 'planny:v1:';
const cache = new Map<string, Entry>();
const subs = new Map<string, Set<() => void>>();
const inflight = new Map<string, Promise<unknown>>();
const EMPTY: Entry = { loading: false, fetchedAt: 0 };

function read(key: string): Entry {
  let e = cache.get(key);
  if (!e) {
    e = { ...EMPTY };
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw) e.data = JSON.parse(raw);
    } catch {
      /* ignore */
    }
    cache.set(key, e);
  }
  return e;
}

function write(key: string, patch: Partial<Entry>) {
  const next = { ...read(key), ...patch };
  cache.set(key, next);
  if ('data' in patch) {
    try {
      if (patch.data === undefined) localStorage.removeItem(PREFIX + key);
      else localStorage.setItem(PREFIX + key, JSON.stringify(patch.data));
    } catch {
      /* storage full / private mode */
    }
  }
  subs.get(key)?.forEach((fn) => fn());
}

export function peek<T>(key: string): T | undefined {
  return read(key).data as T | undefined;
}

export function mutate<T>(key: string, updater: T | undefined | ((prev: T | undefined) => T | undefined)) {
  const prev = read(key).data as T | undefined;
  const data = typeof updater === 'function' ? (updater as (p: T | undefined) => T | undefined)(prev) : updater;
  write(key, { data, error: undefined });
}

export function revalidate<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  write(key, { loading: true });
  const p = fetcher()
    .then((data) => {
      write(key, { data, error: undefined, loading: false, fetchedAt: Date.now() });
      return data;
    })
    .catch((error: Error) => {
      write(key, { error, loading: false });
      throw error;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export function clearStore() {
  cache.clear();
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export function useResource<T>(key: string | null, fetcher: () => Promise<T>, { pollMs = 30_000 } = {}) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const subscribe = useCallback(
    (fn: () => void) => {
      if (!key) return () => {};
      let set = subs.get(key);
      if (!set) subs.set(key, (set = new Set()));
      set.add(fn);
      return () => {
        set.delete(fn);
      };
    },
    [key],
  );
  const entry = useSyncExternalStore(subscribe, () => (key ? read(key) : EMPTY)) as Entry<T>;

  const refresh = useCallback(() => {
    if (!key) return Promise.resolve(undefined);
    return revalidate(key, () => fetcherRef.current()).catch(() => undefined);
  }, [key]);

  useEffect(() => {
    if (!key) return;
    if (Date.now() - read(key).fetchedAt > 5_000) void refresh();
    const onWake = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const timer = window.setInterval(onWake, pollMs);
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('online', onWake);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('online', onWake);
    };
  }, [key, pollMs, refresh]);

  return { ...entry, refresh };
}
