'use server';
import { z } from 'zod';
import { fetchWhenSignedIn } from '@/features/auth/lib/auth.server';
import type { ApiResult } from '@/shared/lib/apiResult';
import { parseSchema } from '@/shared/lib/parseSchema';
import type { Ticket, TicketViewData } from '../types/ticket';
export async function getTicketAction(
  id: string,
): Promise<ApiResult<TicketViewData>> {
  const parsed = await parseSchema(z.uuid(), id);
  if (!parsed.success) return parsed.error;
  const result = await fetchWhenSignedIn<Ticket>(
    'bookings/' + parsed.data + '/ticket',
  );
  if (!result.success || !result.data) return { ...result, data: undefined };
  const { qr, ...ticket } = result.data;
  return {
    ...result,
    data: { ...ticket, qr: { imageDataUrl: qr.imageDataUrl } },
  };
}
