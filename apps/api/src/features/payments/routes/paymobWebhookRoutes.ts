import { Router } from 'express';
import { paymobWebhookController } from '../controllers/paymobWebhookController.ts';

export const paymobWebhookRouter = Router();

// Server-to-server callback: signature authentication, no passenger cookies.
paymobWebhookRouter.post('/webhook', paymobWebhookController);

// Browser query parameters are untrusted and never change a booking.
paymobWebhookRouter.get('/return', (_request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response
    .type('html')
    .send(
      `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>متابعة الدفع</title></head><body><main><h1>انتهت خطوة الدفع</h1><p>هذه الصفحة لا تؤكد نجاح الدفع أو الحجز. راجع حالة الحجز بعد اكتمال التحقق من نتيجة الدفع.</p><p>يمكنك الآن إغلاق هذه الصفحة والرجوع إلى التطبيق.</p></main></body></html>`,
    );
});
