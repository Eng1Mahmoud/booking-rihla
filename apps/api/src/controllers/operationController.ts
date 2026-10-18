import { refundStatisticsService } from '../services/refundStatisticsService.ts';
import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import { cancellationSchema, refundIdSchema } from '../schemas/refundSchema.ts';
import { paginationQuerySchema } from '../schemas/paginationSchema.ts';
import { tripCancellationService } from '../services/tripCancellationService.ts';
import {
  configuredRefundService,
  refundReadService,
} from '../services/refundService.ts';
function id(value: unknown) {
  const parsed = refundIdSchema.safeParse(value);
  if (!parsed.success)
    throw new AppError(400, 'VALIDATION_ERROR', 'A valid UUID is required');
  return parsed.data;
}
export const operationController = {
  async refundStatistics(_request: Request, response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    response.json({ data: await refundStatisticsService.get() });
  },
  async cancel(request: Request, response: Response) {
    if (!request.is('application/json'))
      throw new AppError(
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        'Content-Type must be application/json',
      );
    const input = cancellationSchema.safeParse(request.body);
    if (!input.success)
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Provide a cancellation reason of 5-500 characters',
      );
    response.setHeader('Cache-Control', 'no-store');
    response.json({
      data: await tripCancellationService.cancel(
        response.locals.auth,
        id(request.params.id),
        input.data.reason,
      ),
    });
  },
  async listRefunds(request: Request, response: Response) {
    const parsed = paginationQuerySchema.safeParse(request.query);
    if (!parsed.success)
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Use supported pagination fields',
      );
    response.setHeader('Cache-Control', 'no-store');
    response.json({
      data: await refundReadService.list(parsed.data.limit, parsed.data.offset),
      pagination: parsed.data,
    });
  },
  async getRefund(request: Request, response: Response) {
    const value = await refundReadService.get(id(request.params.id));
    if (!value) throw new AppError(404, 'REFUND_NOT_FOUND', 'Refund not found');
    response.setHeader('Cache-Control', 'no-store');
    response.json({ data: value });
  },
  async reconcileRefund(request: Request, response: Response) {
    const refundId = id(request.params.id);
    if (!(await refundReadService.get(refundId)))
      throw new AppError(404, 'REFUND_NOT_FOUND', 'Refund not found');
    response.setHeader('Cache-Control', 'no-store');
    response.json({
      data: await configuredRefundService().reconcile(refundId),
    });
  },
  async issueRefund(request: Request, response: Response) {
    const refundId = id(request.params.id);
    response.setHeader('Cache-Control', 'no-store');
    response.status(202).json({
      data: await configuredRefundService().issue(
        response.locals.auth,
        refundId,
      ),
    });
  },
};
