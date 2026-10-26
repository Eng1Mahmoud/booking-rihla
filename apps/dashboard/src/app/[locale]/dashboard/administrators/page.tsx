import { requireAdministrator } from '@/features/auth/lib/access.server';
import { AdministratorsManager } from '@/features/administrators/components/AdministratorsManager';
export default async function AdministratorsPage() {
  await requireAdministrator(['SUPER_ADMIN']);
  return <AdministratorsManager />;
}
