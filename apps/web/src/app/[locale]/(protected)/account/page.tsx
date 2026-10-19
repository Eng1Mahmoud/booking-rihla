import type { Metadata } from 'next';
import { AccountProfile } from '@/features/account/components/AccountProfile';
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function AccountPage() {
  return (
    <div className="container-shell page-space">
      <AccountProfile />
    </div>
  );
}
