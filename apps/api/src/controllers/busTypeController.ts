import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import type { BusTypeService } from '../services/busTypeService.ts';
import {
  createFleetMetadataSchema,
  updateFleetMetadataSchema,
  fleetMetadataIdSchema,
  fleetMetadataListSchema,
  fleetMetadataDetailsSchema,
} from '../schemas/fleetMetadataSchema.ts';
function id(request: Request) {
  const parsed = fleetMetadataIdSchema.safeParse(request.params.id);
  if (
    !parsed.success ||
    !fleetMetadataDetailsSchema.safeParse(request.query).success
  )
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Use a UUID id without query parameters',
    );
  return parsed.data;
}
function json(request: Request) {
  if (!request.is('application/json'))
    throw new AppError(
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      'Content-Type must be application/json',
    );
  if (!fleetMetadataDetailsSchema.safeParse(request.query).success)
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'No query parameters are supported',
    );
}
function missing() {
  return new AppError(404, 'BUS_TYPE_NOT_FOUND', 'Bus type not found');
}
export function createBusTypeController(service: BusTypeService) {
  return {
    async list(request: Request, response: Response) {
      const query = fleetMetadataListSchema.safeParse(request.query);
      if (!query.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Use only valid limit and offset pagination',
        );
      response.json({
        data: await service.list(query.data),
        pagination: query.data,
      });
    },
    async getById(request: Request, response: Response) {
      const result = await service.findById(id(request));
      if (!result) throw missing();
      response.json({ data: result });
    },
    async create(request: Request, response: Response) {
      json(request);
      const input = createFleetMetadataSchema.safeParse(request.body);
      if (!input.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide only code (1-32 uppercase letters/digits/underscores, starting with a letter), nameAr and nameEn (1-100 characters)',
        );
      const item = await service.create(input.data);
      response
        .location('/api/v1/bus-types/' + item.id)
        .status(201)
        .json({ data: item });
    },
    async update(request: Request, response: Response) {
      const itemId = id(request);
      json(request);
      const input = updateFleetMetadataSchema.safeParse(request.body);
      if (!input.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide at least one valid code, nameAr or nameEn; no other fields are allowed',
        );
      const result = await service.update(itemId, input.data);
      if (!result) throw missing();
      response.json({ data: result });
    },
    async remove(request: Request, response: Response) {
      if (!(await service.remove(id(request)))) throw missing();
      response.status(204).end();
    },
  };
}
