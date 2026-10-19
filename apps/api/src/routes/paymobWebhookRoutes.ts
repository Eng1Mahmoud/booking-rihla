import { Router } from 'express';
import { createPaymobWebhookController } from '../controllers/paymobWebhookController.ts';
import type { PaymobWebhookService } from '../services/paymobWebhookService.ts';
export function createPaymobWebhookRouter(service: PaymobWebhookService) {
  const router = Router();
  // Server-to-server callback: signature authentication, no passenger cookies.
  router.post('/webhook', createPaymobWebhookController(service));
  // Browser query parameters are untrusted and never change a booking.
  router.get('/return', (_request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response
      .type('html')
      .send(
        `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>متابعة الدفع</title></head><body><main><h1>انتهت خطوة الدفع</h1><p>هذه الصفحة لا تؤكد نجاح الدفع أو الحجز. راجع حالة الحجز بعد اكتمال التحقق من نتيجة الدفع.</p><p>يمكنك الآن إغلاق هذه الصفحة والرجوع إلى التطبيق.</p></main></body></html>`,
      );
  });
  return router;
}
