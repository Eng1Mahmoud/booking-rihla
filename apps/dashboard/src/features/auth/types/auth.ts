export type UserRole = 'USER' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN';
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
};
export type LoginInput = { email: string; password: string };
export type RegisterInput = LoginInput & {
  name: string;
  phone: string;
  language: string;
};

// Safe server-rendered session view; tokens never enter this browser cache.
export type AuthSession = { user: AuthUser | null; error?: string };
