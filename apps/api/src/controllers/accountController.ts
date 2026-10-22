import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import { paginationQuerySchema } from '../schemas/paginationSchema.ts';
import type { AuthContext } from '../services/sessionService.ts';
import type { AccountPaymentService } from '../services/accountPaymentService.ts';
import { sendSuccess } from '../utils/apiResponse.ts';

export function createAccountController(payments: AccountPaymentService) {
  return {
    async payments(request: Request, response: Response) {
      const query = paginationQuerySchema.safeParse(request.query);
      if (!query.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Provide only bounded limit and offset',
        );
      const auth = response.locals['auth'] as AuthContext;
      sendSuccess(response, await payments.list(auth.user.id, query.data));
    },
  };
}
