import { assistantLimiter } from '../../../middlewares/rateLimiters.ts';

import { Router } from 'express';

import { createAssistantController } from '../controllers/assistantController.ts';

export const assistantRouter = Router();
const controller = createAssistantController();
assistantRouter.get('/status', controller.status);
assistantRouter.post('/chat', assistantLimiter, (req, res, next) => {
  void controller.chat(req, res).catch(next);
});
