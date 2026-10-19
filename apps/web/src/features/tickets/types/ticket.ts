export type Ticket = {
  id: string;
  bookingId: string;
  reference: string;
  issuedAt: string;
  currency: 'EGP';
  totalPiastres: number;
  passengers: { name: string; seatNumber: number }[];
  trip: {
    id: string;
    departureAt: string;
    arrivalAt: string;
    origin: { nameAr: string; nameEn: string; cityAr: string; cityEn: string };
    destination: {
      nameAr: string;
      nameEn: string;
      cityAr: string;
      cityEn: string;
    };
  };
  qr: { payload: string; imageDataUrl: string };
};
