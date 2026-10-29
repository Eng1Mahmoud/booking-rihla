import type { StationInput } from '../schemas/stationSchema';
import type { City } from '@/features/cities/types/city';
export type Station = StationInput & { id: string };
export type StationRow = Station & { city: City };
