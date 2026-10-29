import { z } from 'zod';
import type { useTranslations } from 'next-intl';
import { isCalendarDate } from '@/features/trips/schemas/searchSchema';
import { searchSchema } from '@/features/trips/schemas/searchSchema';

export const assistantTripSchema = z
  .object({
    id: z.uuid(),
    departureAt: z.iso.datetime(),
    arrivalAt: z.iso.datetime(),
    priceEgp: z.number().nonnegative(),
    originCity: z.string(),
    originCityEn: z.string().optional(),
    originStation: z.string(),
    originStationEn: z.string().optional(),
    destinationCity: z.string(),
    destinationCityEn: z.string().optional(),
    destinationStation: z.string(),
    destinationStationEn: z.string().optional(),
    busType: z.string().nullable(),
    busTypeEn: z.string().nullable().optional(),
    seatCount: z.number().int().nonnegative(),
    availableSeats: z.number().int().nonnegative().optional(),
    availabilityCheckedAt: z.iso.datetime().optional(),
    tripPagePath: z.string(),
    amenities: z.array(z.string()).optional(),
    amenitiesEn: z.array(z.string()).optional(),
  })
  .refine((trip) => trip.tripPagePath === '/trips/' + trip.id);
export type AssistantTrip = z.infer<typeof assistantTripSchema>;

export const assistantCitySchema = z.object({
  id: z.uuid(),
  nameAr: z.string().max(100),
  nameEn: z.string().max(100),
});
export const assistantStationSchema = assistantCitySchema.extend({
  cityId: z.uuid(),
  cityNameAr: z.string().max(100).optional(),
  cityNameEn: z.string().max(100).optional(),
});
export type AssistantStation = z.infer<typeof assistantStationSchema>;
export const assistantSearchSchema = searchSchema.safeExtend({
  departureTimeAfter: z
    .string()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .optional(),
  departureTimeBefore: z
    .string()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .optional(),
  sortBy: z.enum(['departure', 'price']).optional(),
});
export type AssistantSearch = z.infer<typeof assistantSearchSchema>;

export function createSuggestionSchema(
  mode: 'date' | 'time' | null,
  today: string,
  t: ReturnType<typeof useTranslations<'Forms'>>,
) {
  return z.object(
    {
      value:
        mode === 'date'
          ? z
              .string({ error: t('required') })
              .refine(isCalendarDate, { error: t('date') })
              .refine((value) => !isCalendarDate(value) || value >= today, {
                error: t('upcomingDate'),
              })
          : z
              .string({ error: t('required') })
              .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, { error: t('time') }),
    },
    { error: t?.('invalid') },
  );
}
