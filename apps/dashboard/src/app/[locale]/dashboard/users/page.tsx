import { getSignedInUser } from '@/features/auth/server';
import { UsersManager } from '@/features/users';

export default async function UsersPage() {
  const user = await getSignedInUser();
  return <UsersManager superAdmin={user?.role === 'SUPER_ADMIN'} />;
}