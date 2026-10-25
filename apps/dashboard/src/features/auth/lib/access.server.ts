import 'server-only';
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
