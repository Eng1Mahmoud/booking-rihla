import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { apiFetch } from '@/shared/lib/api';
import { getSessionCookies } from '@/shared/lib/session';
import { getApiDataOrThrow } from '@/shared/lib/apiResult';
import type { AuthUser } from '../types/auth';

// Deduplicate user reads within one server render, never between users.
export const getSignedInUser = cache(async (): Promise<AuthUser | null> => {
  const session = getSessionCookies(await cookies());
  if (!session.access) return null;
  const result = await apiFetch<AuthUser>('auth/me', {
    accessToken: session.access,
  });
  if (result.status === 401) return null;
  const { id, name, email, phone, role } = getApiDataOrThrow(result);
  return { id, name, email, phone, role };
});
