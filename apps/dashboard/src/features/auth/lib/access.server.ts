import 'server-only';
import { apiFetch } from '@/shared/lib/api';
import { apiFailure } from '@/shared/lib/apiResult';
import type { AuthUser } from '../types/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getSignedInUser } from './auth.server';
export async function requireAdministrator() {
  const locale = await getLocale();
  const user = await getSignedInUser();
  if (!user) {
    const returnTo = (await headers()).get('x-bus-return-to') ?? '/dashboard';
    redirect('/' + locale + '/login?returnTo=' + encodeURIComponent(returnTo));
  }
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')
    redirect('/' + locale + '/forbidden');
  return user;
}

// Layout protection alone does not authorize independently invoked Actions.
export async function checkStaffAccess() {
  const result = await apiFetch<AuthUser>('auth/me');
  if (!result.success) return { ...result, data: undefined };
  if (result.data?.role !== 'ADMIN' && result.data?.role !== 'SUPER_ADMIN') {
    return apiFailure(403, 'FORBIDDEN', await getLocale());
  }
  return { ...result, data: undefined };
}
