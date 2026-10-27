import { requireAdministrator } from '@/features/auth/lib/access.server';
import { TicketScanPanel } from '@/features/ticket-scan/components/TicketScanPanel';

export default async function TicketScanPage() {
  await requireAdministrator(['STAFF', 'ADMIN', 'SUPER_ADMIN']);
  return <TicketScanPanel />;
}
