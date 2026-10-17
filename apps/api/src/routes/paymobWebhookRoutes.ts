import { Router } from 'express';
import { createPaymobWebhookController } from '../controllers/paymobWebhookController.ts';
import type { PaymobWebhookService } from '../services/paymobWebhookService.ts';
export function createPaymobWebhookRouter(service: PaymobWebhookService) {
  const router = Router();
  // Server-to-server callback: signature authentication, no passenger cookies.
  router.post('/webhook', createPaymobWebhookController(service));
  return router;
}
