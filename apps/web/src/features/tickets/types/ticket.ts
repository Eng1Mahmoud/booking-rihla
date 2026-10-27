export type Ticket = {
  id: string;
  bookingId: string;
  reference: string;
  issuedAt: string;
  currency: 'EGP';
  totalPiastres: number;
  passengers: {
    seatId: string;
    name: string;
    seatNumber: number;
    qr: { payload: string; imageDataUrl: string };
  }[];
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

export type TicketViewData = Omit<Ticket, 'qr' | 'passengers'> & {
  passengers: (Omit<Ticket['passengers'][number], 'qr'> & {
    qr: { imageDataUrl: string };
  })[];
  qr: { imageDataUrl: string };
};
