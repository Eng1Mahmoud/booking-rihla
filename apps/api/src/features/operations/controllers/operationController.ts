import { sendSuccess } from '../../../utils/apiResponse.ts';
import { refundStatisticsService } from '../../refunds/services/refundStatisticsService.ts';
import type { Request, Response } from 'express';
import { AppError } from '../../../errors/AppError.ts';
import {
  cancellationSchema,
  refundIdSchema,
} from '../../refunds/schemas/refundSchema.ts';
import { paginationQuerySchema } from '../../../shared/paginationSchema.ts';
import { tripCancellationService } from '../../trips/services/tripCancellationService.ts';
import {
  configuredRefundService,
  refundReadService,
} from '../../refunds/services/refundService.ts';
import { parseInput, requireJson } from '../../../shared/requestValidation.ts';
function id(value: unknown) {
  const parsed = parseInput(refundIdSchema, value, 'A valid UUID is required');
  return parsed;
}
export const operationController = {
  async refundStatistics(_request: Request, response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    sendSuccess(response, await refundStatisticsService.get());
  },
  async cancel(request: Request, response: Response) {
    requireJson(request);
    const input = parseInput(
      cancellationSchema,
      request.body,
      'Provide a cancellation reason of 5-500 characters',
    );
    response.setHeader('Cache-Control', 'no-store');
    sendSuccess(
      response,
      await tripCancellationService.cancel(
        response.locals.auth,
        id(request.params.id),
        input.reason,
      ),
    );
  },
  async listRefunds(request: Request, response: Response) {
    const parsed = parseInput(
      paginationQuerySchema,
      request.query,
      'Use supported pagination fields',
    );
    response.setHeader('Cache-Control', 'no-store');
    const { items, total } = await refundReadService.list(
      parsed.limit,
      parsed.offset,
    );
    sendSuccess(response, {
      items,
      total,
      pagination: parsed,
    });
  },
  async getRefund(request: Request, response: Response) {
    const value = await refundReadService.get(id(request.params.id));
    if (!value) throw new AppError(404, 'REFUND_NOT_FOUND', 'Refund not found');
    response.setHeader('Cache-Control', 'no-store');
    sendSuccess(response, value);
  },
  async reconcileRefund(request: Request, response: Response) {
    const refundId = id(request.params.id);
    if (!(await refundReadService.get(refundId)))
      throw new AppError(404, 'REFUND_NOT_FOUND', 'Refund not found');
    response.setHeader('Cache-Control', 'no-store');
    sendSuccess(
      response,
      await configuredRefundService().review(response.locals.auth, refundId),
    );
  },
  async issueRefund(request: Request, response: Response) {
    const refundId = id(request.params.id);
    response.setHeader('Cache-Control', 'no-store');
    sendSuccess(
      response.status(202),
      await configuredRefundService().issue(response.locals.auth, refundId),
    );
  },
};
