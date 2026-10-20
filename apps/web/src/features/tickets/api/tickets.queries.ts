import 'server-only';
import { requireCurrentUser } from '@/features/auth/api/auth.queries';
import { apiFetch } from '@/shared/lib/apiFetch';
import { unwrapApiResult } from '@/shared/lib/apiResult';
import type { Ticket } from '../types/ticket';

export async function getTicket(id: string) {
  await requireCurrentUser();
  return unwrapApiResult(await apiFetch<Ticket>('bookings/' + id + '/ticket'));
}
