import { requireAdministrator } from '@/features/auth/lib/access.server';
import { RefundsManager } from '@/features/refunds/components/RefundsManager';
export default async function RefundsPage() {
  await requireAdministrator(['SUPER_ADMIN']);
  return <RefundsManager />;
}
