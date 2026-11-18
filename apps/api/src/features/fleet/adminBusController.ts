import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse.ts';
import { adminBusListQuerySchema } from './adminBusSchema.ts';
import { adminBusService } from './adminBusService.ts';
import { parseInput } from '../../shared/requestValidation.ts';

export const adminBusController = {
  async list(request: Request, response: Response) {
    const query = parseInput(
      adminBusListQuerySchema,
      request.query,
      'Invalid bus list filters',
    );
    sendSuccess(
      response.set('Cache-Control', 'private, no-store'),
      await adminBusService.list(query),
    );
  },
};
