import { sendSuccess } from '../../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../../errors/AppError.ts';
import { adminBookingListQuerySchema } from './adminBookingSchema.ts';
import { bookingIdSchema, bookingDetailsQuerySchema } from './bookingSchema.ts';
import { adminBookingService } from './adminBookingService.ts';

export const adminBookingController = {
  async list(request: Request, response: Response) {
    const parsed = adminBookingListQuerySchema.safeParse(request.query);
    if (!parsed.success)
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Use limit 1-100, offset 0-100000 and optional booking reference, tripId/userId UUIDs, customer email and travelDate (YYYY-MM-DD Cairo, years 2000-9998); no other query fields',
      );
    const { items, total } = await adminBookingService.list(parsed.data);
    sendSuccess(response, {
      items,
      total,
      pagination: { limit: parsed.data.limit, offset: parsed.data.offset },
    });
  },
  async getById(request: Request, response: Response) {
    const id = bookingIdSchema.safeParse(request.params.id);
    if (
      !id.success ||
      !bookingDetailsQuerySchema.safeParse(request.query).success
    )
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Booking id must be a valid UUID; no query parameters are supported',
      );
    const booking = await adminBookingService.findById(id.data);
    if (!booking)
      throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
    sendSuccess(response, booking);
  },
};
