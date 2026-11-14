import { sendSuccess } from '../../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../../errors/AppError.ts';
import {
  adminPaymentIdSchema,
  adminPaymentListQuerySchema,
} from './adminPaymentSchema.ts';
import { bookingDetailsQuerySchema } from '../bookings/bookingSchema.ts';
import { adminPaymentService } from './adminPaymentService.ts';

export const adminPaymentController = {
  async list(request: Request, response: Response) {
    const query = adminPaymentListQuerySchema.safeParse(request.query);
    if (!query.success)
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Provide bounded pagination and supported exact payment filters only',
      );
    const { items, total } = await adminPaymentService.list(query.data);
    sendSuccess(response, {
      items,
      total,
      pagination: { limit: query.data.limit, offset: query.data.offset },
    });
  },
  async getById(request: Request, response: Response) {
    const id = adminPaymentIdSchema.safeParse(request.params.id);
    if (
      !id.success ||
      !bookingDetailsQuerySchema.safeParse(request.query).success
    )
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Provide a payment-attempt UUID without query parameters',
      );
    const data = await adminPaymentService.findById(id.data);
    if (!data)
      throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment not found');
    sendSuccess(response, data);
  },
};
