import {
  loginLimiter,
  sessionRefreshLimiter,
  profileUpdateLimiter,
  logoutLimiter,
  logoutAllLimiter,
} from '../../../middlewares/rateLimiters.ts';

import { Router } from 'express';
import cookieParser from 'cookie-parser';

import { sessionController } from '../controllers/sessionController.ts';
import { requireAuth } from '../../../middlewares/requireAuth.ts';
import { sessionCsrf } from '../../../middlewares/sessionCsrf.ts';

export function createSessionRouter(allowedOrigins: string[]) {
  const router = Router();

  router.use((_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  });

  router.use(cookieParser());

  router.post(
    '/login',
    loginLimiter,
    sessionCsrf(allowedOrigins),
    sessionController.login,
  );

  router.post(
    '/refresh',
    sessionRefreshLimiter,
    sessionCsrf(allowedOrigins),
    sessionController.refresh,
  );

  router.get('/me', requireAuth, sessionController.me);

  router.patch(
    '/me',
    sessionCsrf(allowedOrigins),
    requireAuth,
    profileUpdateLimiter,
    sessionController.updateProfile,
  );

  router.post(
    '/logout',
    logoutLimiter,
    sessionCsrf(allowedOrigins),
    sessionController.logout,
  );

  router.post(
    '/logout-all',
    logoutAllLimiter,
    sessionCsrf(allowedOrigins),
    requireAuth,
    sessionController.logoutAll,
  );
  return router;
}
