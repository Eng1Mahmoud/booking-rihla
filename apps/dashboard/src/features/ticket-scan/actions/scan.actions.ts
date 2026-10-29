'use server';

import { apiFetch } from '@/shared/lib/api';

export type ScanTicketResult = {
  code:
    | 'OK'
    | 'ALREADY_BOARDED'
    | 'OUTSIDE_WINDOW'
    | 'NOT_ELIGIBLE'
    | 'NOT_FOUND'
    | 'INVALID_QR';
  action: 'verify' | 'board';
  boardedAt: string | null;
  ticket: {
    id: string;
    bookingId: string;
    reference: string;
    passenger: { seatId: string; name: string; seatNumber: string | number };
    trip: {
      id: string;
      departureAt: string;
      arrivalAt: string;
      origin: string;
      destination: string;
    };
    totalPiastres: number;
  } | null;
};

export async function scanTicketAction(input: unknown) {
  return apiFetch<ScanTicketResult>('admin/tickets/scan', {
    method: 'POST',
    body: input,
  });
}
