import type { z } from 'zod';
import type {
  operationReportSchema,
  paymentReportSchema,
} from '../schemas/reportSchema';
export type OperationReport = z.infer<typeof operationReportSchema>;
export type PaymentReport = z.infer<typeof paymentReportSchema>;
