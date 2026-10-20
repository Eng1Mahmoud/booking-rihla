import { sendSuccess } from '../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import {
  adminPaymentIdSchema,
  adminPaymentListQuerySchema,
} from '../schemas/adminPaymentSchema.ts';
import { bookingDetailsQuerySchema } from '../schemas/bookingSchema.ts';
import type { AdminPaymentService } from '../services/adminPaymentService.ts';
export function createAdminPaymentController(service: AdminPaymentService) {
  return {
    async list(request: Request, response: Response) {
      const query = adminPaymentListQuerySchema.safeParse(request.query);
      if (!query.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide bounded pagination and supported exact payment filters only',
        );
      sendSuccess(response, {
        items: await service.list(query.data),
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
      const data = await service.findById(id.data);
      if (!data)
        throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment not found');
      sendSuccess(response, data);
    },
  };
}
