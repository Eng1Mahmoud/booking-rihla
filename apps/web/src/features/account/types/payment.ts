export type PaymentHistoryItem = {
  id: string;
  bookingId: string;
  reference: string;
  createdAt: string;
  amountPiastres: number;
  currency: 'EGP';
  bookingStatus: string;
  paymentStatus: string;
  refund: {
    status: string;
    amountPiastres: number;
    createdAt: string;
    updatedAt: string;
  } | null;
};
export type PaymentHistoryPage = {
  items: PaymentHistoryItem[];
  pagination: { limit: number; offset: number; hasMore: boolean };
};
