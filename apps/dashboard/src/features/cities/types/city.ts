import type { z } from 'zod';
import type { citySchema, cityRowSchema } from '../schemas/citySchema';
export type City = z.infer<typeof citySchema>;
export type CityRow = z.infer<typeof cityRowSchema>;
