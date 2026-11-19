import type { RequestHandler } from 'express';
import { AppError } from '../errors/AppError.ts';
import type { UserRole } from '../features/auth/schemas/authSchema.ts';
import {
  sessionService,
  type AuthContext,
} from '../features/auth/services/sessionService.ts';

export const requireAuth: RequestHandler = async (request, response, next) => {
  response.set('Cache-Control', 'no-store');
  const header = request.headers.authorization;
  const token =
    typeof header === 'string'
      ? // Extract the token from the Authorization header get the token after the "Bearer " prefix, if it exists, otherwise return an empty string
        (header.match(/^Bearer ([^\s]+)$/i)?.[1] ?? '')
      : '';
  if (!token)
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
  response.locals['auth'] = await sessionService.authenticateAccessToken(token);
  next();
};

function requireRole(...allowed: UserRole[]): RequestHandler {
  return (_request, response, next) => {
    const auth = response.locals['auth'] as AuthContext | undefined;
    if (!auth)
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    if (!allowed.includes(auth.user.role))
      throw new AppError(
        403,
        'FORBIDDEN',
        'You do not have permission for this action',
      );
    next();
  };
}

export const adminMiddleware = [
  requireAuth,
  requireRole('ADMIN', 'SUPER_ADMIN'),
];

export const superAdminMiddleware = [requireAuth, requireRole('SUPER_ADMIN')];

export const gateStaffMiddleware = [
  requireAuth,
  requireRole('STAFF', 'ADMIN', 'SUPER_ADMIN'),
];
