import type { z } from 'zod';
import type { amenitySchema } from '../schemas/amenitySchema';
export type Amenity = z.infer<typeof amenitySchema>;
