import { getSignedInUser } from '@/features/auth/server';
import { TripsManager } from '@/features/trips';

export default async function TripsPage() {
  const user = await getSignedInUser();
  return <TripsManager superAdmin={user?.role === 'SUPER_ADMIN'} />;
}