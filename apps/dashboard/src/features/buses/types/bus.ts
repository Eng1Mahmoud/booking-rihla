import type { BusInput } from '../schemas/busSchema';
import type { BusType } from '@/features/bus-types/types/busType';
import type { Amenity } from '@/features/amenities/types/amenity';
export type Bus = Omit<BusInput, 'amenityIds'> & {
  id: string;
  busType: BusType | null;
  amenities: Amenity[];
};
export type BusOptions = { busTypes: BusType[]; amenities: Amenity[] };
