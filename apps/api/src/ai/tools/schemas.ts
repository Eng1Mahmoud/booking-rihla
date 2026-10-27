import { z } from 'zod';

/** Public tool input schemas — never trust model-invented IDs without validation. */

export const getCitiesInputSchema = z.object({
  query: z
    .string()
    .trim()
    .max(100)
    .optional()
    .describe('Optional name filter (Arabic or English, partial match)'),
});

export const getStationsInputSchema = z.object({
  cityId: z.uuid().optional().describe('Filter stations by city UUID'),
  cityName: z
    .string()
    .trim()
    .max(100)
    .optional()
    .describe('Resolve city by Arabic/English name when cityId is unknown'),
  query: z
    .string()
    .trim()
    .max(100)
    .optional()
    .describe('Optional station name filter'),
});

export const searchTripsInputSchema = z.object({
  originCityName: z.string().trim().max(100).optional(),
  destinationCityName: z.string().trim().max(100).optional(),
  originCityId: z.uuid().optional(),
  destinationCityId: z.uuid().optional(),
  originStationId: z.uuid().optional(),
  destinationStationId: z.uuid().optional(),
  travelDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('YYYY-MM-DD in Africa/Cairo; relative dates resolved server-side'),
  relativeDate: z
    .enum(['today', 'tomorrow', 'day_after_tomorrow'])
    .optional()
    .describe('Prefer this over travelDate when user speaks relatively'),
  departureTimeAfter: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .describe('HH:mm Cairo time — only return trips departing at or after this'),
  departureTimeBefore: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .describe('HH:mm Cairo time — only return trips departing before this'),
  sortBy: z.enum(['departure', 'price']).optional().default('departure'),
  limit: z.number().int().min(1).max(10).optional().default(5),
});

export const getTripDetailsInputSchema = z.object({
  tripId: z.uuid().describe('Validated trip UUID from a previous search result'),
});

export const getAvailableSeatsInputSchema = z.object({
  tripId: z.uuid().describe('Validated trip UUID from a previous search result'),
});

export const getBookingInfoInputSchema = z.object({
  topic: z
    .enum([
      'how_to_book',
      'cancellation',
      'payment',
      'refund',
      'hold_time',
      'general',
    ])
    .optional()
    .default('general'),
});

export type GetCitiesInput = z.infer<typeof getCitiesInputSchema>;
export type GetStationsInput = z.infer<typeof getStationsInputSchema>;
export type SearchTripsInput = z.infer<typeof searchTripsInputSchema>;
export type GetTripDetailsInput = z.infer<typeof getTripDetailsInputSchema>;
export type GetAvailableSeatsInput = z.infer<typeof getAvailableSeatsInputSchema>;
export type GetBookingInfoInput = z.infer<typeof getBookingInfoInputSchema>;
