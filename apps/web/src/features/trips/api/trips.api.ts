import { apiClient } from '@/shared/lib/apiClient';
import type { SeatList } from '../types/trip';
export const tripsApi = {
  seats: async (id: string, signal?: AbortSignal) =>
    (
      await apiClient.get<{ data: SeatList }>('trips/' + id + '/seats', {
        signal,
      })
    ).data,
};
