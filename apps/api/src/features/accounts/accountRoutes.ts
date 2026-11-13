import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.ts';
import { createAccountController } from './accountController.ts';
import type { SessionService } from '../auth/sessionService.ts';
import type { AccountPaymentService } from './accountPaymentService.ts';

export function createAccountRouter(
  payments: AccountPaymentService,
  sessions: SessionService,
) {
  const router = Router();
  router.use(requireAuth(sessions));
  router.get('/payments', createAccountController(payments).payments);
  return router;
}
