import { assistantRateLimit } from '../ai/assistantService.ts';
import { clientRateLimitKey } from '../utils/clientIdentity.ts';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createAssistantController } from '../controllers/assistantController.ts';

const assistantLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: assistantRateLimit,
  keyGenerator: clientRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'AI_RATE_LIMIT',
    message: 'Too many assistant requests. Try again shortly.',
  },
});

export function createAssistantRouter() {
  const router = Router();
  const controller = createAssistantController();

  router.get('/status', controller.status);
  router.post('/chat', assistantLimiter, (req, res, next) => {
    void controller.chat(req, res).catch(next);
  });

  return router;
}
