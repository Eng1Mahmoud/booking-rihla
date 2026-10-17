import { Router, type RequestHandler } from 'express';
import { createAuditLogController } from '../controllers/auditLogController.ts';
import type { AuditLogService } from '../services/auditLogService.ts';
export function createAuditLogRouter(
  service: AuditLogService,
  superAdmin: RequestHandler[],
) {
  const router = Router();
  router.use(...superAdmin);
  const controller = createAuditLogController(service);
  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  return router;
}
