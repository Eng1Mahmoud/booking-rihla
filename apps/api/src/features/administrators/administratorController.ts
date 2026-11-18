import { sendSuccess } from '../../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../../errors/AppError.ts';
import type { AuthContext } from '../auth/sessionService.ts';
import { administratorService } from './administratorService.ts';
import {
  administratorIdSchema,
  administratorDetailsQuerySchema,
  administratorListQuerySchema,
  updateAdministratorRoleSchema,
  updateAdministratorStatusSchema,
} from './administratorSchema.ts';
import { parseInput, requireJson } from '../../shared/requestValidation.ts';
function id(request: Request) {
  const parsed = administratorIdSchema.safeParse(request.params.id);
  if (
    !parsed.success ||
    !administratorDetailsQuerySchema.safeParse(request.query).success
  )
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Account id must be a UUID; no query parameters are supported',
    );
  return parsed.data;
}
export const administratorController = {
  async list(request: Request, response: Response) {
    const query = parseInput(
      administratorListQuerySchema,
      request.query,
      'Use bounded limit/offset and optional email, role ADMIN/SUPER_ADMIN and isActive true/false',
    );
    const { items, total } = await administratorService.list(query);
    sendSuccess(response, {
      items,
      total,
      pagination: { limit: query.limit, offset: query.offset },
    });
  },
  async getById(request: Request, response: Response) {
    const user = await administratorService.findById(id(request));
    if (!user)
      throw new AppError(
        404,
        'ADMINISTRATOR_NOT_FOUND',
        'Administrator account not found',
      );
    sendSuccess(response, user);
  },
  async updateRole(request: Request, response: Response) {
    const target = id(request);
    requireJson(request);
    const input = parseInput(
      updateAdministratorRoleSchema,
      request.body,
      'Provide only role USER, ADMIN or SUPER_ADMIN',
    );
    const user = await administratorService.updateRole(
      response.locals['auth'] as AuthContext,
      target,
      input,
    );
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Account not found');
    sendSuccess(response, user);
  },
  async updateStatus(request: Request, response: Response) {
    const target = id(request);
    requireJson(request);
    const input = parseInput(
      updateAdministratorStatusSchema,
      request.body,
      'Provide only isActive as a boolean',
    );
    const user = await administratorService.updateStatus(
      response.locals['auth'] as AuthContext,
      target,
      input,
    );
    if (!user)
      throw new AppError(
        404,
        'ADMINISTRATOR_NOT_FOUND',
        'Administrator account not found',
      );
    sendSuccess(response, user);
  },
};
