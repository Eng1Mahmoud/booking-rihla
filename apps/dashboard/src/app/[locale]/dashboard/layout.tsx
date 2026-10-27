import type { ReactNode } from 'react';
import { requireAdministrator } from '@/features/auth/lib/access.server';
import { DashboardShell } from '@/features/dashboard/components/DashboardShell';
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireAdministrator(['STAFF', 'ADMIN', 'SUPER_ADMIN']);
  return <DashboardShell user={user}>{children}</DashboardShell>;
}
