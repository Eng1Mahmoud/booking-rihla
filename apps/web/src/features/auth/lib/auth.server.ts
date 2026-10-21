import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { apiFetch } from '@/shared/lib/api';
import { ApiError, unwrapApiResult } from '@/shared/lib/apiResult';
import { readAuthCookies } from '@/shared/lib/session';
import type { AuthUser } from '../types/auth';

// React cache deduplicates within this render only, never between users.
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  if (!readAuthCookies({ cookies: await cookies() }).access) return null;
  const result = await apiFetch<AuthUser>('auth/me');
  if (result.status === 401) return null;
  const { id, name, email, phone, role } = unwrapApiResult(result);
  return { id, name, email, phone, role };
});

// Pages/layouts may render in parallel: private readers must also require a live user.
export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED');
  return user;
}
