import { apiClient } from '@/shared/lib/apiClient';
import type { Ticket } from '../types/ticket';
export const ticketsApi = {
  get: async (id: string, signal?: AbortSignal) =>
    (
      await apiClient.get<{ data: Ticket }>('bookings/' + id + '/ticket', {
        signal,
      })
    ).data,
};
