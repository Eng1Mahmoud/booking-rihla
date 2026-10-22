import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getSignedInUser } from '@/features/auth/lib/auth.server';
import { ReadError } from '@/shared/components/feedback/ReadError';
import { errorMessage } from '@/shared/lib/apiResult';

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
  if (!user) redirect('/' + locale + '/login');
  return children;
}
