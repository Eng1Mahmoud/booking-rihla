import type { z } from 'zod';
import type { stationSchema, stationRowSchema } from '../schemas/stationSchema';
export type Station = z.infer<typeof stationSchema>;
export type StationRow = z.infer<typeof stationRowSchema>;
