import { sendSuccess } from '../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import type { AuthContext } from '../services/sessionService.ts';
import type { AdministratorService } from '../services/administratorService.ts';
import {
  administratorIdSchema,
  administratorDetailsQuerySchema,
  administratorListQuerySchema,
  updateAdministratorRoleSchema,
  updateAdministratorStatusSchema,
} from '../schemas/administratorSchema.ts';
export function createAdministratorController(service: AdministratorService) {
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
  return {
    async list(request: Request, response: Response) {
      const query = administratorListQuerySchema.safeParse(request.query);
      if (!query.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Use bounded limit/offset and optional email, role ADMIN/SUPER_ADMIN and isActive true/false',
        );
      const data = await service.list(query.data);
      sendSuccess(response, {
        items: data,
        pagination: { limit: query.data.limit, offset: query.data.offset },
      });
    },
    async getById(request: Request, response: Response) {
      const user = await service.findById(id(request));
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
      if (!request.is('application/json'))
        throw new AppError(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Content-Type must be application/json',
        );
      const input = updateAdministratorRoleSchema.safeParse(request.body);
      if (!input.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide only role USER, ADMIN or SUPER_ADMIN',
        );
      const user = await service.updateRole(
        response.locals['auth'] as AuthContext,
        target,
        input.data,
      );
      if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Account not found');
      sendSuccess(response, user);
    },
    async updateStatus(request: Request, response: Response) {
      const target = id(request);
      if (!request.is('application/json'))
        throw new AppError(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Content-Type must be application/json',
        );
      const input = updateAdministratorStatusSchema.safeParse(request.body);
      if (!input.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide only isActive as a boolean',
        );
      const user = await service.updateStatus(
        response.locals['auth'] as AuthContext,
        target,
        input.data,
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
}
