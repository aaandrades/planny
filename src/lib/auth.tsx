import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, UNAUTHORIZED_EVENT } from './api';
import { clearStore } from './store';

const USER_KEY = 'planny:user';
const USERS_KEY = 'planny:users';

interface AuthState {
  user: string | null;
  users: string[];
  ready: boolean;
  login: (name: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const load = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const save = (key: string, value: unknown) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(() => load(USER_KEY, null));
  const [users, setUsers] = useState<string[]>(() => load(USERS_KEY, []));
  // If we remember who you are, render immediately (offline-friendly) and verify in the background.
  const [ready, setReady] = useState(() => !!load(USER_KEY, null));

  useEffect(() => {
    api
      .me()
      .then((res) => {
        setUser(res.user);
        setUsers(res.users);
        save(USER_KEY, res.user);
        save(USERS_KEY, res.users);
      })
      .catch(() => {
        /* offline: trust the cached identity */
      })
      .finally(() => setReady(true));

    const onUnauthorized = () => {
      setUser(null);
      save(USER_KEY, null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async (name: string, pin: string) => {
    const res = await api.login(name, pin);
    setUser(res.user);
    save(USER_KEY, res.user);
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    clearStore();
    setUser(null);
    save(USER_KEY, null);
  }, []);

  const value = useMemo(() => ({ user, users, ready, login, logout }), [user, users, ready, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Name of the logged-in traveler (only call inside authenticated routes). */
export function useUser(): string {
  return useAuth().user ?? '';
}
