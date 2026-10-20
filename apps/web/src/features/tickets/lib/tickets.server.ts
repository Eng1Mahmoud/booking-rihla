import 'server-only';
import { requireCurrentUser } from '@/features/auth/lib/auth.server';
import { apiFetch } from '@/shared/lib/api';
import { unwrapApiResult } from '@/shared/lib/apiResult';
import type { Ticket } from '../types/ticket';

export async function getTicket(id: string) {
  const user = await requireCurrentUser();
  const { qr, ...ticket } = unwrapApiResult(
    await apiFetch<Ticket>('bookings/' + id + '/ticket'),
  );
  return {
    ticket: { ...ticket, qr: { imageDataUrl: qr.imageDataUrl } },
    userId: user.id,
  };
}
