import type { Seat } from '@/features/trips';

/** Parse ?seats=id1,id2 and keep only currently available ids. */
export function seatIdsFromQuery(value: string | null, seats: Seat[]) {
  if (!value) return [] as string[];
  const available = new Set(
    seats.filter((seat) => seat.isAvailable).map((seat) => seat.id),
  );
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const part of value.split(',')) {
    const id = part.trim();
    if (!id || seen.has(id) || !available.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function availableSeatsByIds(seats: Seat[], ids: string[]) {
  return seats.filter((seat) => ids.includes(seat.id) && seat.isAvailable);
}
