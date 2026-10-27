import { Temporal } from 'temporal-polyfill';
export function tripLocalTime(value: string) {
  return Temporal.Instant.from(value)
    .toZonedDateTimeISO('Africa/Cairo')
    .toPlainDateTime()
    .toString();
}

// Add elapsed time to the instant, so midnight and Cairo daylight-saving transitions stay correct.
export function calculateTripSchedule(
  date: string,
  time: string,
  durationMinutes: number,
) {
  const milliseconds = Math.round(durationMinutes * 60000);
  if (
    !date ||
    !time ||
    !Number.isFinite(durationMinutes) ||
    !Number.isSafeInteger(milliseconds) ||
    milliseconds <= 0
  )
    return null;
  try {
    const departure = Temporal.PlainDateTime.from(date + 'T' + time)
      .toZonedDateTime('Africa/Cairo', { disambiguation: 'reject' })
      .toInstant();
    return {
      departureAt: departure.toString(),
      arrivalAt: departure.add({ milliseconds }).toString(),
    };
  } catch {
    return null;
  }
}
