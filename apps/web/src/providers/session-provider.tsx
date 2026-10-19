'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useStore } from 'zustand';
import { useQueryClient } from '@tanstack/react-query';
import {
  createSessionStore,
  type SessionData,
  type SessionState,
} from '@/stores/session-store';
import { browserRequest, BrowserApiError } from '@/lib/browser-api';
type SessionStore = ReturnType<typeof createSessionStore>;
type ContextValue = {
  store: SessionStore;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => void;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
};
const SessionContext = createContext<ContextValue | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createSessionStore);
  const queryClient = useQueryClient();
  const inFlight = useRef<Promise<string | null> | null>(null);
  const generation = useRef(0);
  const refresh = useCallback(() => {
    if (inFlight.current) return inFlight.current;
    const epoch = generation.current;
    inFlight.current = browserRequest<{ data: SessionData }>('auth/refresh', {
      method: 'POST',
      body: '{}',
    })
      .then((result) => {
        if (epoch !== generation.current) return null;
        store.getState().setSession(result.data);
        return result.data.accessToken;
      })
      .catch(() => {
        if (epoch === generation.current) store.getState().setSession(null);
        return null;
      })
      .finally(() => {
        inFlight.current = null;
      });
    return inFlight.current;
  }, [store, queryClient]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const clearSession = useCallback(() => {
    generation.current += 1;
    queryClient.clear();
    store.getState().setSession(null);
  }, [store, queryClient]);
  const login = useCallback(
    async (email: string, password: string) => {
      if (inFlight.current) await inFlight.current;
      const result = await browserRequest<{ data: SessionData }>('auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      generation.current += 1;
      queryClient.clear();
      store.getState().setSession(result.data);
    },
    [store, queryClient],
  );
  const logout = useCallback(async () => {
    if (inFlight.current) await inFlight.current;
    await browserRequest('auth/logout', { method: 'POST', body: '{}' });
    generation.current += 1;
    queryClient.clear();
    store.getState().setSession(null);
  }, [store, queryClient]);
  const request = useCallback(
    async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
      let token = store.getState().accessToken ?? (await refresh());
      if (!token) throw new BrowserApiError(401, 'UNAUTHENTICATED');
      try {
        return await browserRequest<T>(path, {
          ...options,
          headers: { ...options.headers, Authorization: 'Bearer ' + token },
        });
      } catch (error) {
        if (!(error instanceof BrowserApiError) || error.status !== 401)
          throw error;
        token = await refresh();
        if (!token) throw error;
        return browserRequest<T>(path, {
          ...options,
          headers: { ...options.headers, Authorization: 'Bearer ' + token },
        });
      }
    },
    [refresh, store],
  );
  return (
    <SessionContext.Provider
      value={{ store, login, logout, request, clearSession }}
    >
      {children}
    </SessionContext.Provider>
  );
}
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('SessionProvider is missing');
  const state = useStore(context.store, (value: SessionState) => value);
  return {
    ...state,
    login: context.login,
    logout: context.logout,
    clearSession: context.clearSession,
    request: context.request,
  };
}
