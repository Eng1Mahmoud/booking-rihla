import { Router } from 'express';

import { authController } from '../controllers/authController.ts';

export const authRouter = Router();
authRouter.use((_request, response, next) => {
  response.set('Cache-Control', 'no-store');
  next();
});
authRouter.post('/register', authController.register);
authRouter.post('/verify-email', authController.verifyEmail);
authRouter.post('/resend-verification', authController.resendVerification);
