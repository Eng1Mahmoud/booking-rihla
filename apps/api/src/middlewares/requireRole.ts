import type { RequestHandler } from 'express';
import type { UserRole } from '../schemas/authSchema.ts';
import type { AuthContext } from '../services/sessionService.ts';
import { AppError } from '../errors/AppError.ts';

export function requireRole(...allowed: UserRole[]): RequestHandler {
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
