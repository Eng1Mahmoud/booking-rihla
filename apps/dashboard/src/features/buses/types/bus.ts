import type { z } from 'zod';
import type { busSchema } from '../schemas/busSchema';
import type { BusType } from '@/features/bus-types/types/busType';
import type { Amenity } from '@/features/amenities/types/amenity';
export type Bus = z.infer<typeof busSchema>;
export type BusOptions = { busTypes: BusType[]; amenities: Amenity[] };
