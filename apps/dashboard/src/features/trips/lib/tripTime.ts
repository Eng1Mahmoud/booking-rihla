import { Temporal } from 'temporal-polyfill';
export function tripLocalTime(value: string) {
  return Temporal.Instant.from(value)
    .toZonedDateTimeISO('Africa/Cairo')
    .toPlainDateTime()
    .toString();
}
