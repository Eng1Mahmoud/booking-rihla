import { sendSuccess } from '../utils/apiResponse.ts';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError.ts';
import { auditLogQuerySchema } from '../schemas/auditLogSchema.ts';
import type { AuditLogService } from '../services/auditLogService.ts';
export function createAuditLogController(service: AuditLogService) {
  return {
    async list(request: Request, response: Response) {
      const query = auditLogQuerySchema.safeParse(request.query);
      if (!query.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Use pagination and optional actorId, entity, entityId, action, from/to ISO timestamps; from must not be after to',
        );
      sendSuccess(response, {
        items: await service.list(query.data),
        pagination: { limit: query.data.limit, offset: query.data.offset },
      });
    },
    async getById(request: Request, response: Response) {
      const id = z.uuid().safeParse(request.params.id);
      if (!id.success || Object.keys(request.query).length)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Use a valid audit id without query parameters',
        );
      const row = await service.findById(id.data);
      if (!row)
        throw new AppError(404, 'AUDIT_LOG_NOT_FOUND', 'Audit log not found');
      sendSuccess(response, row);
    },
  };
}
