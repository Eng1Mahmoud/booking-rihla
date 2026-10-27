'use server';

import { checkStaffAccess } from '@/features/auth/lib/access.server';
import { apiFetch } from '@/shared/lib/api';
import { z } from 'zod';

const bodySchema = z.object({
  payload: z.string().trim().min(20).max(2048),
  action: z.enum(['verify', 'board']).default('verify'),
  language: z.enum(['ar', 'en']).optional(),
});

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
  const access = await checkStaffAccess(['STAFF', 'ADMIN', 'SUPER_ADMIN']);
  if (!access.success) return access;

  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      status: 400,
      code: 'VALIDATION_ERROR',
      data: undefined,
    };
  }

  return apiFetch<ScanTicketResult>('admin/tickets/scan', {
    method: 'POST',
    body: parsed.data,
  });
}
