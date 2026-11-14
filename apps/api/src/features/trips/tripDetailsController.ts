import { sendSuccess } from '../../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../../errors/AppError.ts';
import { tripIdSchema, tripDetailsQuerySchema } from './tripSchema.ts';
import { tripDetailsService } from './tripDetailsService.ts';

function validateRequest(request: Request): string {
  const id = tripIdSchema.safeParse(request.params.id);
  if (!id.success || !tripDetailsQuerySchema.safeParse(request.query).success)
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Trip id must be a valid UUID; no query parameters are supported',
    );
  return id.data;
}

export const tripDetailsController = {
  async getById(request: Request, response: Response) {
    response.set('Cache-Control', 'no-store');
    const trip = await tripDetailsService.findById(validateRequest(request));
    if (!trip) throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip not found');
    sendSuccess(response, trip);
  },
  async listSeats(request: Request, response: Response) {
    response.set('Cache-Control', 'no-store');
    const seats = await tripDetailsService.listSeats(validateRequest(request));
    if (!seats) throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip not found');
    sendSuccess(response, seats);
  },
};
