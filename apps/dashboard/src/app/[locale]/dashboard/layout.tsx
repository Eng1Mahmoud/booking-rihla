import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getSignedInUser } from '@/features/auth/lib/auth.server';
import { DashboardShell } from '@/features/dashboard/components/DashboardShell';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getSignedInUser();
  if (!user) redirect('/' + (await getLocale()) + '/login');
  return <DashboardShell user={user}>{children}</DashboardShell>;
}