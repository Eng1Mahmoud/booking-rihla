import type { Request, Response } from 'express';
import { AppError } from '../../../errors/AppError.ts';
import { parseInput, requireJson } from '../../../shared/requestValidation.ts';
import { sendSuccess } from '../../../utils/apiResponse.ts';
import {
  createFleetMetadataSchema,
  fleetMetadataDetailsSchema,
  fleetMetadataIdSchema,
  fleetMetadataListSchema,
  updateFleetMetadataSchema,
  type FleetMetadata,
  type FleetMetadataInput,
  type FleetMetadataQuery,
  type FleetMetadataUpdate,
} from '../schemas/fleetMetadataSchema.ts';

type FleetMetadataService = {
  list(query: FleetMetadataQuery): Promise<FleetMetadata[]>;
  findById(id: string): Promise<FleetMetadata | null>;
  create(input: FleetMetadataInput): Promise<FleetMetadata>;
  update(id: string, input: FleetMetadataUpdate): Promise<FleetMetadata | null>;
  remove(id: string): Promise<FleetMetadata | null>;
};

function readId(request: Request) {
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

export function createFleetMetadataController(
  service: FleetMetadataService,
  options: { basePath: string; missingCode: string; missingMessage: string },
) {
  function notFound() {
    return new AppError(404, options.missingCode, options.missingMessage);
  }

  return {
    async list(request: Request, response: Response) {
      const query = parseInput(
        fleetMetadataListSchema,
        request.query,
        'Use only valid limit and offset pagination',
      );
      sendSuccess(response, {
        items: await service.list(query),
        pagination: query,
      });
    },
    async getById(request: Request, response: Response) {
      const result = await service.findById(readId(request));
      if (!result) throw notFound();
      sendSuccess(response, result);
    },
    async create(request: Request, response: Response) {
      requireJson(request);
      parseInput(
        fleetMetadataDetailsSchema,
        request.query,
        'No query parameters are supported',
      );
      const input = parseInput(
        createFleetMetadataSchema,
        request.body,
        'Provide only code (1-32 uppercase letters/digits/underscores, starting with a letter), nameAr and nameEn (1-100 characters)',
      );
      const item = await service.create(input);
      sendSuccess(
        response.location(`${options.basePath}/${item.id}`).status(201),
        item,
      );
    },
    async update(request: Request, response: Response) {
      const id = readId(request);
      requireJson(request);
      const input = parseInput(
        updateFleetMetadataSchema,
        request.body,
        'Provide at least one valid code, nameAr or nameEn; no other fields are allowed',
      );
      const result = await service.update(id, input);
      if (!result) throw notFound();
      sendSuccess(response, result);
    },
    async remove(request: Request, response: Response) {
      if (!(await service.remove(readId(request)))) throw notFound();
      sendSuccess(response);
    },
  };
}
