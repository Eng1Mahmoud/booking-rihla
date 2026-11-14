import type { Request, Response } from 'express';
import { AppError } from '../../errors/AppError.ts';
import { sendSuccess } from '../../utils/apiResponse.ts';
import { adminBusListQuerySchema } from './adminBusSchema.ts';
import { adminBusService } from './adminBusService.ts';

export const adminBusController = {
  async list(request: Request, response: Response) {
    const query = adminBusListQuerySchema.safeParse(request.query);
    if (!query.success)
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid bus list filters');
    sendSuccess(
      response.set('Cache-Control', 'private, no-store'),
      await adminBusService.list(query.data),
    );
  },
};
