import { Router } from 'express';
import cookieParser from 'cookie-parser';

import { sessionController } from '../controllers/sessionController.ts';
import { requireAuth } from '../../../middlewares/authorizationMiddleware.ts';
import { sessionCsrf } from '../../../middlewares/sessionCsrf.ts';

export function createSessionRouter(allowedOrigins: string[]) {
  const router = Router();

  router.use((_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  });

  router.use(cookieParser());

  router.post('/login', sessionCsrf(allowedOrigins), sessionController.login);

  router.post(
    '/refresh',
    sessionCsrf(allowedOrigins),
    sessionController.refresh,
  );

  router.get('/me', requireAuth, sessionController.me);

  router.patch(
    '/me',
    sessionCsrf(allowedOrigins),
    requireAuth,
    sessionController.updateProfile,
  );

  router.post('/logout', sessionCsrf(allowedOrigins), sessionController.logout);

  router.post(
    '/logout-all',
    sessionCsrf(allowedOrigins),
    requireAuth,
    sessionController.logoutAll,
  );
  return router;
}
