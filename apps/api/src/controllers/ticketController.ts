import { sendSuccess } from '../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import {
  bookingIdSchema,
  bookingDetailsQuerySchema,
} from '../schemas/bookingSchema.ts';
import type { TicketService } from '../services/ticketService.ts';
import type { AuthContext } from '../services/sessionService.ts';
export function createTicketController(service: TicketService) {
  return async (request: Request, response: Response) => {
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
    const ticket = await service.findByBooking(auth.user.id, id.data);
    if (!ticket)
      throw new AppError(404, 'TICKET_NOT_FOUND', 'Ticket not found');
    sendSuccess(response, ticket);
  };
}
