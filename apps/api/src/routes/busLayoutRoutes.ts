import { Router } from 'express';
import { createBusLayoutController } from '../controllers/busLayoutController.ts';
import type { BusLayoutService } from '../services/busLayoutService.ts';
// Mounted inside the admin-protected bus router; retain its bus id parameter.
export function createBusLayoutRouter(service: BusLayoutService) {
  const router = Router({ mergeParams: true }),
    controller = createBusLayoutController(service);
  router.get('/', controller.get);
  router.put('/', controller.replace);
  router.delete('/', controller.remove);
  return router;
}
