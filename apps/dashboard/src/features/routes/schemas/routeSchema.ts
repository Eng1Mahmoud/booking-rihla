import type { useTranslations } from 'next-intl';
import { z } from 'zod';

export function createRouteFormSchema(
  t: ReturnType<typeof useTranslations<'Forms'>>,
) {
  const station = z.uuid({
    error: (issue) => (issue.input === '' ? t('required') : t('selection')),
  });
  return z
    .object(
      {
        originStationId: station,
        destinationStationId: station,
        estimatedDurationMinutes: z
          .string({ error: t('required') })
          .refine((value) => /^[0-9]+$/.test(value), {
            error: (issue) =>
              issue.input === '' ? t('required') : t('wholeNumber'),
          })
          .transform(Number)
          .pipe(
            z
              .number({ error: t('wholeNumber') })
              .int({ error: t('wholeNumber') })
              .min(1, { error: t('minValue', { value: '1' }) })
              .max(10080, { error: t('maxValue', { value: '10080' }) }),
          ),
        isActive: z.boolean({ error: t('selection') }),
      },
      { error: t?.('invalid') },
    )
    .refine((value) => value.originStationId !== value.destinationStationId, {
      path: ['destinationStationId'],
      error: t('differentStations'),
    });
}
export type RouteInput = z.output<ReturnType<typeof createRouteFormSchema>>;
export type Route = RouteInput & { id: string };
export type RouteListQuery = {
  limit: number;
  offset: number;
  originStationId: string;
  destinationStationId: string;
  isActive: '' | 'true' | 'false';
};
