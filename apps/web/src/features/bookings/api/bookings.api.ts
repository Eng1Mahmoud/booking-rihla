import { invokeAction, pollPayment } from '@/shared/lib/apiClient';
import type { PaymentState } from '../types/booking';
import {
  createBookingAction,
  checkoutAction,
  refreshPaymentAction,
} from '../actions/bookings.actions';
import type { CreateBookingInput } from '../schemas/bookingSchema';
export const bookingsApi = {
  create: async (input: CreateBookingInput) => ({
    data: await invokeAction(() => createBookingAction(input)),
  }),
  payment: (id: string, signal?: AbortSignal) =>
    pollPayment<PaymentState>(id, signal),
  refreshPayment: (id: string) => invokeAction(() => refreshPaymentAction(id)),
  checkout: ({ id, prepare }: { id: string; prepare: boolean }) => {
    // Keep the same client-generated key for the whole action invocation.
    const input = {
      id,
      prepare,
      idempotencyKey: prepare ? crypto.randomUUID() : undefined,
    };
    return invokeAction(() => checkoutAction(input));
  },
};
