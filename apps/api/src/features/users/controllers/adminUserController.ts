import { sendSuccess } from '../../../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { AppError } from '../../../errors/AppError.ts';
import {
  adminUserIdSchema,
  adminUserDetailsQuerySchema,
  adminUserListQuerySchema,
  updateUserStatusSchema,
} from '../schemas/adminUserSchema.ts';
import { adminUserService } from '../services/adminUserService.ts';
import { parseInput, requireJson } from '../../../shared/requestValidation.ts';

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
export const adminUserController = {
  async list(request: Request, response: Response) {
    const query = parseInput(
      adminUserListQuerySchema,
      request.query,
      'Use limit 1-100, offset 0-100000, optional email, international phone and isActive true/false; no other query fields',
    );
    const { items, total } = await adminUserService.list(query);
    sendSuccess(response, {
      items,
      total,
      pagination: { limit: query.limit, offset: query.offset },
    });
  },
  async getById(request: Request, response: Response) {
    const user = await adminUserService.findById(id(request));
    if (!user)
      throw new AppError(404, 'USER_NOT_FOUND', 'Passenger account not found');
    sendSuccess(response, user);
  },
  async updateStatus(request: Request, response: Response) {
    const userId = id(request);
    requireJson(request);
    const input = parseInput(
      updateUserStatusSchema,
      request.body,
      'Provide only isActive as a boolean',
    );
    const user = await adminUserService.updateStatus(userId, input);
    if (!user)
      throw new AppError(404, 'USER_NOT_FOUND', 'Passenger account not found');
    sendSuccess(response, user);
  },
};
