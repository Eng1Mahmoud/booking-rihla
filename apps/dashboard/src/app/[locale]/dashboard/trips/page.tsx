import { requireAdministrator } from '@/features/auth/lib/access.server';
import { TripsManager } from '@/features/trips/components/TripsManager';
export default async function TripsPage() {
  const user = await requireAdministrator();
  return <TripsManager superAdmin={user.role === 'SUPER_ADMIN'} />;
}
