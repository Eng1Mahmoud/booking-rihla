import { apiClient } from '@/shared/lib/apiClient';
import type { SeatList } from '../types/trip';

// Temporary browser seat polling, removed when reads migrate to Server Components.
export const tripsApi = {
  seats: async (id: string, signal?: AbortSignal) =>
    (
      await apiClient.get<{ data: SeatList }>('trips/' + id + '/seats', {
        signal,
      })
    ).data,
};
