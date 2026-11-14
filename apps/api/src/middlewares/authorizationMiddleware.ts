import { requireAuth } from './requireAuth.ts';
import { requireRole } from './requireRole.ts';

export const adminMiddleware = [
  requireAuth,
  requireRole('ADMIN', 'SUPER_ADMIN'),
];

export const superAdminMiddleware = [requireAuth, requireRole('SUPER_ADMIN')];

export const gateStaffMiddleware = [
  requireAuth,
  requireRole('STAFF', 'ADMIN', 'SUPER_ADMIN'),
];
