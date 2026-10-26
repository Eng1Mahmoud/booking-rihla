import { requireAdministrator } from '@/features/auth/lib/access.server';
import { UsersManager } from '@/features/users/components/UsersManager';
export default async function UsersPage() {
  const user = await requireAdministrator();
  return <UsersManager superAdmin={user.role === 'SUPER_ADMIN'} />;
}
