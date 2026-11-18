import { Temporal } from 'temporal-polyfill';

export const cairoTimeZone = 'Africa/Cairo';
export function cairoDayBounds(date: string) {
  const day = Temporal.PlainDate.from(date);
  return {
    start: day.toZonedDateTime(cairoTimeZone).toInstant().toString(),
    end: day
      .add({ days: 1 })
      .toZonedDateTime(cairoTimeZone)
      .toInstant()
      .toString(),
  };
}
export function cairoToday() {
  return Temporal.Now.plainDateISO(cairoTimeZone).toString();
}
