import type { BookingFilter } from '../schemas/bookingSchema';
import type { Trip } from '@/features/trips/types/trip';
export type Booking = {
  id: string;
  reference: string;
  status: string;
  expiresAt: string | null;
  seatCount: number;
  totalPiastres: number;
  unitPricePiastres: number;
  contactPhone: string;
  paymentRequired: boolean;
  passengers?: { seatId: string; seatNumber: number; name: string }[];
  trip: Pick<Trip, 'id' | 'departureAt' | 'arrivalAt' | 'route'>;
};
export type BookingListPage = {
  items: Booking[];
  pagination: {
    limit: number;
    offset: number;
    filter: BookingFilter;
    hasMore: boolean;
  };
};
export type BookingPaymentData = {
  bookingId: string;
  bookingStatus: string;
  paymentStatus: string;
  amountPiastres: number;
  expiresAt: string | null;
  serverTime: string;
  checkoutUrl?: string | null;
  refundStatus: string | null;
};

export type PaymentState = {
  payment: BookingPaymentData;
  checkoutEnabled: boolean;
};
export type BookingDetails = PaymentState & {
  booking: Booking;
  userId: string;
  readAt: number;
};
