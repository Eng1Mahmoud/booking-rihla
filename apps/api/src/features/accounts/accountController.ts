import type { Request, Response } from 'express';
import { AppError } from '../../errors/AppError.ts';
import { paginationQuerySchema } from '../../shared/paginationSchema.ts';
import type { AuthContext } from '../auth/sessionService.ts';
import { accountPaymentService } from './accountPaymentService.ts';
import { sendSuccess } from '../../utils/apiResponse.ts';

export const accountController = {
  async payments(request: Request, response: Response) {
    const query = paginationQuerySchema.safeParse(request.query);
    if (!query.success)
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Provide only bounded limit and offset',
      );
    const auth = response.locals['auth'] as AuthContext;
    sendSuccess(
      response,
      await accountPaymentService.list(auth.user.id, query.data),
    );
  },
};
