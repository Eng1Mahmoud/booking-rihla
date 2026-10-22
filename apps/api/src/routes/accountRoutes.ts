import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.ts';
import { createAccountController } from '../controllers/accountController.ts';
import type { SessionService } from '../services/sessionService.ts';
import type { AccountPaymentService } from '../services/accountPaymentService.ts';

export function createAccountRouter(
  payments: AccountPaymentService,
  sessions: SessionService,
) {
  const router = Router();
  router.use(requireAuth(sessions));
  router.get('/payments', createAccountController(payments).payments);
  return router;
}
