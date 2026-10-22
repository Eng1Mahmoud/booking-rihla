import { z } from 'zod';

export const paymentHistoryOffsetSchema = z.number().int().min(0).max(100000);
