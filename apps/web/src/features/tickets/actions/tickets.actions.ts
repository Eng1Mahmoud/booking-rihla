'use server';
import { apiFetch } from '@/shared/lib/api';
import { parseSchema } from '@/shared/lib/parseSchema';
import { z } from 'zod';
import type { ApiResult } from '@/shared/lib/apiResult';
import type { Ticket, TicketViewData } from '../types/ticket';

export async function getTicketAction(
  id: string,
): Promise<ApiResult<TicketViewData>> {
  const parsed = await parseSchema(z.uuid(), id);
  if (!parsed.success) return parsed.error;
  const result = await apiFetch<Ticket>('bookings/' + parsed.data + '/ticket');
  if (!result.success || !result.data) return { ...result, data: undefined };
  const { qr, ...ticket } = result.data;
  return {
    ...result,
    data: {
      ...ticket,
      passengers: ticket.passengers.map(
        ({ qr: passengerQr, ...passenger }) => ({
          ...passenger,
          qr: { imageDataUrl: passengerQr.imageDataUrl },
        }),
      ),
      qr: { imageDataUrl: qr.imageDataUrl },
    },
  };
}
