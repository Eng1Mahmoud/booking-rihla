export type LocalName = { nameAr: string; nameEn: string };
export type Trip = {
  id: string;
  departureAt: string;
  arrivalAt: string;
  pricePiastres: number;
  route: {
    originStation: LocalName & { id: string; city: LocalName & { id: string } };
    destinationStation: LocalName & {
      id: string;
      city: LocalName & { id: string };
    };
  };
  bus: {
    seatCount: number;
    seatLayout: 'STANDARD_2_2' | null;
    busType: (LocalName & { code: string }) | null;
    amenities: (LocalName & { code: string })[];
  };
};
export type Seat = { id: string; number: number; isAvailable: boolean };
export type SeatList = {
  seatLayout: 'STANDARD_2_2' | null;
  tripId: string;
  totalSeats: number;
  availableSeats: number;
  seats: Seat[];
};
