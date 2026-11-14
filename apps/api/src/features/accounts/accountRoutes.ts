import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.ts';
import { accountController } from './accountController.ts';

export const accountRouter = Router();
accountRouter.use(requireAuth);
accountRouter.get('/payments', accountController.payments);
