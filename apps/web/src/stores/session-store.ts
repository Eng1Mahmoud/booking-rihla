import { createStore } from 'zustand/vanilla';
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
};
export type SessionData = {
  user: SessionUser;
  accessToken: string;
  expiresIn: number;
};
export type SessionState = {
  user: SessionUser | null;
  accessToken: string | null;
  status: 'loading' | 'signed-in' | 'guest';
  setSession: (data: SessionData | null) => void;
};
export function createSessionStore() {
  return createStore<SessionState>()((set) => ({
    user: null,
    accessToken: null,
    status: 'loading',
    setSession: (data) =>
      set(
        data
          ? {
              user: data.user,
              accessToken: data.accessToken,
              status: 'signed-in',
            }
          : { user: null, accessToken: null, status: 'guest' },
      ),
  }));
}
