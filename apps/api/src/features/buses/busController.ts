import { sendSuccess } from '../../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../../errors/AppError.ts';
import { busService } from './busService.ts';
import {
  busIdSchema,
  busListQuerySchema,
  createBusSchema,
  updateBusSchema,
} from './busSchema.ts';
import { parseInput, requireJson } from '../../shared/requestValidation.ts';

export const busController = {
  async list(request: Request, response: Response) {
    const query = parseInput(
      busListQuerySchema,
      request.query,
      'Use limit 1-100, offset 0-100000, and optional busTypeId UUID and isActive=true/false; no other query fields are supported',
    );
    const buses = await busService.list(query);
    sendSuccess(response, { items: buses, pagination: query });
  },
  async getById(request: Request, response: Response) {
    const id = parseInput(
      busIdSchema,
      request.params.id,
      'Bus id must be a valid UUID',
    );
    const bus = await busService.findById(id);
    if (!bus) {
      throw new AppError(404, 'BUS_NOT_FOUND', 'Bus not found');
    }
    sendSuccess(response, bus);
  },
  async listSeats(request: Request, response: Response) {
    const id = parseInput(
      busIdSchema,
      request.params.id,
      'Bus id must be a valid UUID',
    );
    const seats = await busService.listSeats(id);
    if (!seats) throw new AppError(404, 'BUS_NOT_FOUND', 'Bus not found');
    sendSuccess(response, seats);
  },
  async create(request: Request, response: Response) {
    requireJson(request);
    const input = parseInput(
      createBusSchema,
      request.body,
      'Provide plateNumber (1-32 characters), seatCount (integer 1-100), optional seatLayout (STANDARD_2_2/null), isActive, busTypeId (UUID/null), and amenityIds (up to 30 distinct UUIDs)',
    );
    const bus = await busService.create(input);
    sendSuccess(response.location('/api/v1/buses/' + bus.id).status(201), bus);
  },
  async update(request: Request, response: Response) {
    const id = parseInput(
      busIdSchema,
      request.params.id,
      'Bus id must be a valid UUID',
    );
    requireJson(request);
    const input = parseInput(
      updateBusSchema,
      request.body,
      'Provide plateNumber (1-32 characters), seatCount (integer 1-100), isActive (boolean), seatLayout (STANDARD_2_2/null), busTypeId (UUID/null), or amenityIds (up to 30 distinct UUIDs); no other fields are allowed',
    );
    const bus = await busService.update(id, input);
    if (!bus) {
      throw new AppError(404, 'BUS_NOT_FOUND', 'Bus not found');
    }
    sendSuccess(response, bus);
  },
  async remove(request: Request, response: Response) {
    const id = parseInput(
      busIdSchema,
      request.params.id,
      'Bus id must be a valid UUID',
    );
    const bus = await busService.remove(id);
    if (!bus) {
      throw new AppError(404, 'BUS_NOT_FOUND', 'Bus not found');
    }
    sendSuccess(response);
  },
};
