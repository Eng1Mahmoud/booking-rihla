import { AdministratorsManager } from '@/features/administrators/components/AdministratorsManager';
import { getSignedInUser } from '@/features/auth/lib/auth.server';

export default async function AdministratorsPage() {
  // The proxy also gates this page; this keeps the UI in step with the API rule.
  const user = await getSignedInUser();
  return <AdministratorsManager canChangeRole={user?.role === 'SUPER_ADMIN'} />;
}
