import { Router } from 'express';
import { requireAuth } from '../../../middlewares/authorizationMiddleware.ts';
import { accountController } from '../controllers/accountController.ts';

export const accountRouter = Router();
accountRouter.use(requireAuth);
accountRouter.get('/payments', accountController.payments);
