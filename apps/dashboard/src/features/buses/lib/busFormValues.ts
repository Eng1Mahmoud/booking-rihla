import type { Bus } from '../types/bus';
import type { BusFormValues } from '../schemas/busSchema';
export function busFormValues(entry: Bus | null): BusFormValues {
  return {
    plateNumber: entry?.plateNumber ?? '',
    seatCount: entry ? String(entry.seatCount) : '',
    seatLayout: entry?.seatLayout ?? '',
    isActive: entry?.isActive ?? true,
    busTypeId: entry?.busTypeId ?? '',
    amenityIds: entry?.amenities.map((item) => item.id) ?? [],
  };
}
