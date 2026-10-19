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
  type SessionUser,
} from '@/stores/session-store';
import {
  browserRequest,
  BrowserApiError,
  SESSION_EXPIRED_EVENT,
} from '@/lib/browser-api';
type ContextValue = {
  store: ReturnType<typeof createSessionStore>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  clearSession: () => void;
  reloadSession: () => Promise<void>;
  request: typeof browserRequest;
};
const SessionContext = createContext<ContextValue | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createSessionStore);
  const queryClient = useQueryClient();
  const generation = useRef(0);
  const loading = useRef<Promise<void> | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const clearLocal = useCallback(() => {
    generation.current += 1;
    queryClient.clear();
    store.getState().setSession(null);
  }, [queryClient, store]);
  const clearSession = useCallback(() => {
    clearLocal();
    channel.current?.postMessage('signed-out');
  }, [clearLocal]);
  const reloadSession = useCallback(() => {
    if (loading.current) return loading.current;
    const epoch = generation.current;
    loading.current = browserRequest<{ data: SessionUser }>('auth/me')
      .then((result) => {
        if (epoch !== generation.current) return;
        if (store.getState().user?.id !== result.data.id) queryClient.clear();
        store.getState().setSession({ user: result.data });
      })
      .catch((error: unknown) => {
        if (epoch !== generation.current) return;
        if (error instanceof BrowserApiError && error.status === 401)
          clearLocal();
        else store.getState().setUnavailable();
      })
      .finally(() => {
        loading.current = null;
      });
    return loading.current;
  }, [store, queryClient, clearLocal]);
  useEffect(() => {
    const onExpired = () => clearLocal();
    const onFocus = () => {
      void reloadSession();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    window.addEventListener('focus', onFocus);
    if (typeof BroadcastChannel !== 'undefined') {
      channel.current = new BroadcastChannel('bus-session');
      channel.current.onmessage = (event: MessageEvent<unknown>) => {
        if (event.data === 'signed-out') clearLocal();
        else if (event.data === 'signed-in') {
          generation.current += 1;
          store.setState({ user: null, status: 'loading' });
          queryClient.clear();
          void Promise.resolve(loading.current).then(() => reloadSession());
        }
      };
    }
    void reloadSession();
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
      window.removeEventListener('focus', onFocus);
      channel.current?.close();
      channel.current = null;
    };
  }, [reloadSession, clearLocal, queryClient, store]);
  const login = useCallback(
    async (email: string, password: string) => {
      if (loading.current) await loading.current;
      const result = await browserRequest<{ data: SessionData }>('auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      generation.current += 1;
      queryClient.clear();
      store.getState().setSession(result.data);
      channel.current?.postMessage('signed-in');
    },
    [store, queryClient],
  );
  const endSession = useCallback(
    async (all: boolean) => {
      if (loading.current) await loading.current;
      await browserRequest(all ? 'auth/logout-all' : 'auth/logout', {
        method: 'POST',
        body: '{}',
      });
      clearSession();
    },
    [clearSession],
  );
  const logout = useCallback(() => endSession(false), [endSession]);
  const logoutAll = useCallback(() => endSession(true), [endSession]);
  return (
    <SessionContext.Provider
      value={{
        store,
        login,
        logout,
        logoutAll,
        clearSession,
        reloadSession,
        request: browserRequest,
      }}
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
    logoutAll: context.logoutAll,
    clearSession: context.clearSession,
    reloadSession: context.reloadSession,
    request: context.request,
  };
}
