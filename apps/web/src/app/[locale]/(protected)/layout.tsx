import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getSignedInUser } from '@/features/auth/server';
import { ReadError } from '@/shared/components/feedback/ReadError';
import { errorMessage } from '@/shared/lib';

/** Second-line RSC guard; middleware already enforces protected paths. */
export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();
  let user;
  try {
    user = await getSignedInUser();
  } catch (error) {
    return <ReadError message={errorMessage(error, locale)} />;
  }
  if (!user) {
    const path = (await headers()).get('x-bus-return-to') ?? '/account';
    redirect('/' + locale + '/login?returnTo=' + encodeURIComponent(path));
  }
  return children;
}
