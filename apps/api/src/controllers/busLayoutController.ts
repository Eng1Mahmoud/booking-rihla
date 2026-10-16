import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import {
  busLayoutSchema,
  busLayoutIdSchema,
  busLayoutQuerySchema,
} from '../schemas/busLayoutSchema.ts';
import type { BusLayoutService } from '../services/busLayoutService.ts';
function busId(request: Request) {
  const id = busLayoutIdSchema.safeParse(request.params.id);
  if (!id.success || !busLayoutQuerySchema.safeParse(request.query).success)
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Use a bus UUID without query parameters',
    );
  return id.data;
}
export function createBusLayoutController(service: BusLayoutService) {
  return {
    async get(request: Request, response: Response) {
      response.json({ data: await service.findByBusId(busId(request)) });
    },
    async replace(request: Request, response: Response) {
      const id = busId(request);
      if (!request.is('application/json'))
        throw new AppError(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Content-Type must be application/json',
        );
      const input = busLayoutSchema.safeParse(request.body);
      if (!input.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide a complete bounded grid with distinct existing seats, a front-corner driver, side doors and an aisle',
        );
      response.json({ data: await service.replace(id, input.data) });
    },
    async remove(request: Request, response: Response) {
      await service.remove(busId(request));
      response.status(204).end();
    },
  };
}
