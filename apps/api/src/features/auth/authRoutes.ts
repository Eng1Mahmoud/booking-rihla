import {
  registrationLimiter,
  emailVerificationLimiter,
  resendVerificationLimiter,
} from '../../middlewares/rateLimiters.ts';

import { Router } from 'express';

import { authController } from './authController.ts';

export const authRouter = Router();
authRouter.use((_request, response, next) => {
  response.set('Cache-Control', 'no-store');
  next();
});
authRouter.post('/register', registrationLimiter, authController.register);
authRouter.post(
  '/verify-email',
  emailVerificationLimiter,
  authController.verifyEmail,
);
authRouter.post(
  '/resend-verification',
  resendVerificationLimiter,
  authController.resendVerification,
);
