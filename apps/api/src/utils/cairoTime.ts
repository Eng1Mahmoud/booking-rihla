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
export function cairoDeparture(date: string, time: string) {
  return Temporal.PlainDate.from(date)
    .toZonedDateTime({ timeZone: cairoTimeZone, plainTime: time })
    .toInstant()
    .toString();
}
