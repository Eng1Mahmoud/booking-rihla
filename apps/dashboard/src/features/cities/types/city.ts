import type { CityInput } from '../schemas/citySchema';
export type City = CityInput & { id: string };
export type CityRow = City & { stationCount: number };
