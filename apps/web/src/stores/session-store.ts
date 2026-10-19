import { createStore } from 'zustand/vanilla';
export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
};
export type SessionData = { user: SessionUser };
export type SessionState = {
  user: SessionUser | null;
  status: 'loading' | 'signed-in' | 'guest' | 'unavailable';
  setSession: (data: SessionData | null) => void;
  setUnavailable: () => void;
};
export function createSessionStore() {
  return createStore<SessionState>()((set) => ({
    user: null,
    status: 'loading',
    setSession: (data) =>
      set(
        data
          ? { user: data.user, status: 'signed-in' }
          : { user: null, status: 'guest' },
      ),
    setUnavailable: () =>
      set((state) => ({ status: state.user ? 'signed-in' : 'unavailable' })),
  }));
}
