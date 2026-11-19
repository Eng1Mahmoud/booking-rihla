import { Router } from 'express';

import { passwordResetController } from '../controllers/passwordResetController.ts';

export const passwordResetRouter = Router();

passwordResetRouter.use((_request, response, next) => {
  response.set('Cache-Control', 'no-store');
  next();
});
passwordResetRouter.post('/forgot-password', passwordResetController.forgot);
passwordResetRouter.post('/reset-password', passwordResetController.reset);
