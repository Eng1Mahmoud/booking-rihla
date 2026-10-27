import { z } from 'zod';
export const busTypeInputSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => /^[A-Z][A-Z0-9_]{0,31}$/.test(value), {
      params: { messageKey: 'code' },
    }),
  nameAr: z.string().trim().min(1).max(100),
  nameEn: z.string().trim().min(1).max(100),
});
export const busTypeSchema = busTypeInputSchema.extend({ id: z.uuid() });
export const saveBusTypeSchema = busTypeInputSchema.extend({
  id: z.uuid().optional(),
});
export const busTypeIdSchema = z.uuid();
export type BusTypeInput = z.infer<typeof busTypeInputSchema>;
