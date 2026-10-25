import type { z } from 'zod';
import type { busTypeSchema } from '../schemas/busTypeSchema';
export type BusType = z.infer<typeof busTypeSchema>;
