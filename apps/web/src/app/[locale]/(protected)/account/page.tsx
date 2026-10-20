import type { Metadata } from 'next';
import { AccountProfile } from '@/features/account/components/AccountProfile';
import { getCurrentUser } from '@/features/auth/lib/auth.server';
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function AccountPage() {
  // The private layout checks the same cached user and handles expired sessions/outages.
  const user = await getCurrentUser().catch(() => null);
  if (!user) return null;
  return (
    <div className="container-shell page-space">
      <AccountProfile user={user} />
    </div>
  );
}
