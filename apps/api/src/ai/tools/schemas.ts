import { z } from 'zod';
import { tripSearchQuerySchema } from '../../schemas/tripSearchSchema.ts';

/** Public tool input schemas — never trust model-invented IDs without validation. */

export const getCitiesInputSchema = z.object({
  limit: z.number().int().min(1).max(20).optional().default(10),
  query: z
    .string()
    .trim()
    .max(100)
    .optional()
    .describe('Optional name filter (Arabic or English, partial match)'),
});

export const getStationsInputSchema = z.object({
  limit: z.number().int().min(1).max(20).optional().default(10),
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
  originCityName: z.string().trim().min(1).max(100).optional(),
  destinationCityName: z.string().trim().min(1).max(100).optional(),
  originCityId: z.uuid().optional(),
  destinationCityId: z.uuid().optional(),
  originStationId: z
    .uuid()
    .nullable()
    .optional()
    .describe('Station UUID; null clears the previous station filter'),
  destinationStationId: z
    .uuid()
    .nullable()
    .optional()
    .describe('Station UUID; null clears the previous station filter'),
  travelDate: tripSearchQuerySchema.shape.travelDate
    .optional()
    .describe(
      'YYYY-MM-DD in Africa/Cairo; relative dates resolved server-side',
    ),
  relativeDate: z
    .enum(['today', 'tomorrow', 'day_after_tomorrow'])
    .optional()
    .describe('Prefer this over travelDate when user speaks relatively'),
  departureTimeAfter: z
    .string()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .optional()
    .describe(
      'HH:mm Cairo time — at or after this; null clears the previous lower bound',
    ),
  departureTimeBefore: z
    .string()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .optional()
    .describe(
      'HH:mm Cairo time — before this; null clears the previous upper bound',
    ),
  sortBy: z.enum(['departure', 'price']).optional(),
  limit: z.number().int().min(1).max(10).optional().default(5),
});

export const getTripDetailsInputSchema = z.object({
  tripId: z
    .uuid()
    .optional()
    .describe(
      'Trip UUID from search results; omit to use the selected trip in this conversation',
    ),
});

export const getAvailableSeatsInputSchema = z.object({
  tripId: z
    .uuid()
    .optional()
    .describe(
      'Trip UUID from search results; omit to use the selected trip in this conversation',
    ),
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
export type GetAvailableSeatsInput = z.infer<
  typeof getAvailableSeatsInputSchema
>;
export type GetBookingInfoInput = z.infer<typeof getBookingInfoInputSchema>;
