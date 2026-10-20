import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getCurrentUser } from '@/features/auth/lib/auth.server';
import { safeReturnPath } from '@/features/auth/lib/safeReturnPath';
import { ReadError } from '@/shared/components/ReadError';
import { errorMessage } from '@/shared/lib/apiResult';

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    return <ReadError message={errorMessage(error, locale)} />;
  }
  if (!user) {
    const path = safeReturnPath(
      (await headers()).get('x-bus-return-to') ?? '/account',
    );
    redirect('/' + locale + '/login?returnTo=' + encodeURIComponent(path));
  }
  return children;
}
