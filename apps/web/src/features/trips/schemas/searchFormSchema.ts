import { z } from 'zod';
import { isCalendarDate } from './searchSchema';
export function searchFormSchema(today: string) {
  const destination = z.string().regex(/^(city|station):[0-9a-f-]{36}$/i);
  return z
    .object({
      origin: destination,
      destination,
      date: z
        .string()
        .refine((value) => isCalendarDate(value) && value >= today),
    })
    .refine((values) => values.origin !== values.destination, {
      path: ['destination'],
    });
}
export type SearchFormValues = z.input<ReturnType<typeof searchFormSchema>>;
