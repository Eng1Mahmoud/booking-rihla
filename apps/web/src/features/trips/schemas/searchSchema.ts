import { z } from 'zod';
export function isCalendarDate(value: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < '2000-01-01' ||
    value > '9998-12-31'
  )
    return false;
  const date = new Date(value + 'T12:00:00Z');
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}
export const searchSchema = z
  .object({
    originCityId: z.uuid().optional(),
    originStationId: z.uuid().optional(),
    destinationCityId: z.uuid().optional(),
    destinationStationId: z.uuid().optional(),
    travelDate: z.string().refine(isCalendarDate),
    offset: z
      .string()
      .regex(/^\d+$/)
      .default('0')
      .transform(Number)
      .pipe(z.number().int().min(0).max(100000)),
  })
  .refine(
    (value) =>
      Boolean(value.originCityId) !== Boolean(value.originStationId) &&
      Boolean(value.destinationCityId) !==
        Boolean(value.destinationStationId) &&
      (!value.originStationId ||
        value.originStationId !== value.destinationStationId),
  );
export type Search = z.infer<typeof searchSchema>;
export function searchHref(search: Search, changes: Partial<Search> = {}) {
  const merged = { ...search, ...changes };
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(merged))
    if (value !== undefined) query.set(key, String(value));
  return '/trips?' + query;
}
export function cairoDate(value: Date | string = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}
export function addDays(date: string, count: number) {
  const value = new Date(date + 'T12:00:00Z');
  value.setUTCDate(value.getUTCDate() + count);
  return value.toISOString().slice(0, 10);
}
