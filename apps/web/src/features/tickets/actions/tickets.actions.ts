'use server';
import { z } from 'zod';
import { getLocale } from 'next-intl/server';
import { apiFetch } from '@/shared/lib/api';
import { validationError, type ApiResult } from '@/shared/lib/apiResult';
import type { Ticket, TicketViewData } from '../types/ticket';
export async function getTicketAction(
  id: string,
): Promise<ApiResult<TicketViewData>> {
  if (!z.uuid().safeParse(id).success)
    return validationError(await getLocale());
  const result = await apiFetch<Ticket>('bookings/' + id + '/ticket', {
    context: 'action',
  });
  if (!result.success || !result.data) return { ...result, data: undefined };
  const { qr, ...ticket } = result.data;
  return {
    ...result,
    data: { ...ticket, qr: { imageDataUrl: qr.imageDataUrl } },
  };
}
