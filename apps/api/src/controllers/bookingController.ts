import { sendSuccess } from '../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import type { AuthContext } from '../services/sessionService.ts';
import type { BookingService } from '../services/bookingService.ts';
import {
  createBookingSchema,
  bookingIdSchema,
  bookingListQuerySchema,
  bookingDetailsQuerySchema,
} from '../schemas/bookingSchema.ts';
export function createBookingController(service: BookingService) {
  const owner = (response: Response) => response.locals['auth'] as AuthContext;
  return {
    async create(request: Request, response: Response) {
      if (!request.is('application/json'))
        throw new AppError(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Content-Type must be application/json',
        );
      const input = createBookingSchema.safeParse(request.body);
      if (
        !input.success ||
        !bookingDetailsQuerySchema.safeParse(request.query).success
      )
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide tripId, contactPhone and 1-100 passengers with distinct seatId/name; no other fields are supported',
        );
      const booking = await service.create(owner(response), input.data);
      sendSuccess(
        response.location('/api/v1/bookings/' + booking.id).status(201),
        booking,
      );
    },
    async list(request: Request, response: Response) {
      const query = bookingListQuerySchema.safeParse(request.query);
      if (!query.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide only a supported booking filter and valid limit/offset pagination',
        );
      const data = await service.list(owner(response).user.id, query.data);
      sendSuccess(response, data);
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
      const booking = await service.findById(owner(response).user.id, id.data);
      if (!booking)
        throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
      sendSuccess(response, booking);
    },
  };
}
