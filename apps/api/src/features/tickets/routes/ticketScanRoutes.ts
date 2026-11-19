import { gateStaffMiddleware } from '../../../middlewares/authorizationMiddleware.ts';
import { Router } from 'express';

import { ticketScanController } from '../controllers/ticketScanController.ts';

export const ticketScanRouter = Router();

// Ticket scanning is available to staff and administrators.
ticketScanRouter.post(
  '/scan',
  ...gateStaffMiddleware,
  ticketScanController.scan,
);
