import { sendSuccess } from '../../../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../../../errors/AppError.ts';
import {
  bookingIdSchema,
  bookingDetailsQuerySchema,
} from '../../bookings/schemas/bookingSchema.ts';
import { ticketService } from '../services/ticketService.ts';
import type { AuthContext } from '../../auth/services/sessionService.ts';

export const ticketController = async (
  request: Request,
  response: Response,
) => {
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
  const auth = response.locals['auth'] as AuthContext;
  const ticket = await ticketService.findByBooking(auth.user.id, id.data);
  if (!ticket) throw new AppError(404, 'TICKET_NOT_FOUND', 'Ticket not found');
  sendSuccess(response, ticket);
};
