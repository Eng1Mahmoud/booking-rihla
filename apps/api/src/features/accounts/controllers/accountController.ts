import type { Request, Response } from 'express';
import { paginationQuerySchema } from '../../../shared/paginationSchema.ts';
import type { AuthContext } from '../../auth/services/sessionService.ts';
import { accountPaymentService } from '../services/accountPaymentService.ts';
import { sendSuccess } from '../../../utils/apiResponse.ts';
import { parseInput } from '../../../shared/requestValidation.ts';

export const accountController = {
  async payments(request: Request, response: Response) {
    const query = parseInput(
      paginationQuerySchema,
      request.query,
      'Provide only bounded limit and offset',
    );
    const auth = response.locals['auth'] as AuthContext;
    sendSuccess(
      response,
      await accountPaymentService.list(auth.user.id, query),
    );
  },
};
