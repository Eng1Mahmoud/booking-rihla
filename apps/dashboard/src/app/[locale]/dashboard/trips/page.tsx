import { getSignedInUser } from '@/features/auth/lib/auth.server';
import { TripsManager } from '@/features/trips/components/TripsManager';

export default async function TripsPage() {
  const user = await getSignedInUser();
  return <TripsManager superAdmin={user?.role === 'SUPER_ADMIN'} />;
}