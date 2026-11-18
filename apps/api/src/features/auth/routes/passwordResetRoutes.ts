import {
  forgotPasswordLimiter,
  resetPasswordLimiter,
} from '../../../middlewares/rateLimiters.ts';

import { Router } from 'express';

import { passwordResetController } from '../controllers/passwordResetController.ts';

export const passwordResetRouter = Router();

passwordResetRouter.use((_request, response, next) => {
  response.set('Cache-Control', 'no-store');
  next();
});
passwordResetRouter.post(
  '/forgot-password',
  forgotPasswordLimiter,
  passwordResetController.forgot,
);
passwordResetRouter.post(
  '/reset-password',
  resetPasswordLimiter,
  passwordResetController.reset,
);
