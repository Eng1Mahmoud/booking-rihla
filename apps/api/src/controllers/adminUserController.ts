import { sendSuccess } from '../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import {
  adminUserIdSchema,
  adminUserDetailsQuerySchema,
  adminUserListQuerySchema,
  updateUserStatusSchema,
} from '../schemas/adminUserSchema.ts';
import type { AdminUserService } from '../services/adminUserService.ts';

export function createAdminUserController(service: AdminUserService) {
  function id(request: Request) {
    const parsed = adminUserIdSchema.safeParse(request.params.id);
    if (
      !parsed.success ||
      !adminUserDetailsQuerySchema.safeParse(request.query).success
    )
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'User id must be a valid UUID; no query parameters are supported',
      );
    return parsed.data;
  }
  return {
    async list(request: Request, response: Response) {
      const query = adminUserListQuerySchema.safeParse(request.query);
      if (!query.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Use limit 1-100, offset 0-100000, optional email, international phone and isActive true/false; no other query fields',
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
          'USER_NOT_FOUND',
          'Passenger account not found',
        );
      sendSuccess(response, user);
    },
    async updateStatus(request: Request, response: Response) {
      const userId = id(request);
      if (!request.is('application/json'))
        throw new AppError(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Content-Type must be application/json',
        );
      const input = updateUserStatusSchema.safeParse(request.body);
      if (!input.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide only isActive as a boolean',
        );
      const user = await service.updateStatus(
        userId,
        input.data,
        response.locals.auth,
      );
      if (!user)
        throw new AppError(
          404,
          'USER_NOT_FOUND',
          'Passenger account not found',
        );
      sendSuccess(response, user);
    },
  };
}
