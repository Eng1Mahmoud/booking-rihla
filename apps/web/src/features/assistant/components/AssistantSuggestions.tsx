'use client';
import { useId, useState } from 'react';
import { z } from 'zod';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui';
import {
  Form,
  DatePickr,
  TimePicker,
  SubmitButton,
} from '@/shared/components/forms';
import { cairoDate, isCalendarDate, searchHref } from '@/features/trips';
import type { AssistantSearch } from '../schemas/resultSchemas';

export function AssistantSuggestions({
  search,
  locale,
  pending,
  onSend,
  onNavigate,
}: {
  search: AssistantSearch;
  locale: 'ar' | 'en';
  pending: boolean;
  onSend: (text: string) => Promise<void>;
  onNavigate: () => void;
}) {
  const isAr = locale === 'ar';
  const [mode, setMode] = useState<'date' | 'time' | null>(null);
  const panelId = useId();
  const today = cairoDate();
  const schema = z.object({
    value:
      mode === 'date'
        ? z
            .string()
            .refine(isCalendarDate)
            .refine((value) => value >= today)
        : z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  });
  const allDayHref = searchHref({
    originCityId: search.originCityId,
    originStationId: search.originStationId,
    destinationCityId: search.destinationCityId,
    destinationStationId: search.destinationStationId,
    travelDate: search.travelDate,
    offset: 0,
  });
  return (
    <section
      aria-label={isAr ? 'خيارات البحث' : 'Search options'}
      className="space-y-2"
    >
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          disabled={pending}
          onClick={() =>
            void onSend(
              isAr
                ? 'اعرض نفس البحث مرتّبًا بالأرخص.'
                : 'Show the same search sorted by lowest price.',
            )
          }
        >
          {isAr ? 'رحلات أرخص' : 'Cheaper trips'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          disabled={pending}
          aria-expanded={mode === 'date'}
          aria-controls={panelId}
          onClick={() => setMode(mode === 'date' ? null : 'date')}
        >
          {isAr ? 'تاريخ آخر' : 'Another date'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          disabled={pending}
          aria-expanded={mode === 'time'}
          aria-controls={panelId}
          onClick={() => setMode(mode === 'time' ? null : 'time')}
        >
          {isAr ? 'وقت آخر' : 'Another time'}
        </Button>
      </div>
      {mode && (
        <div id={panelId}>
          <Form
            key={mode}
            schema={schema}
            defaultValues={{
              value:
                mode === 'date'
                  ? search.travelDate
                  : (search.departureTimeAfter ?? '09:00'),
            }}
            onSubmit={async ({ value }) => {
              const text =
                mode === 'date'
                  ? isAr
                    ? 'غيّر تاريخ البحث إلى ' +
                      value +
                      ' مع الإبقاء على باقي الفلاتر.'
                    : 'Change the search date to ' +
                      value +
                      ' and keep the other filters.'
                  : isAr
                    ? 'ابحث عن نفس المسار والتاريخ بعد الساعة ' +
                      value +
                      ' بتوقيت القاهرة، بدون حد أقصى لوقت المغادرة.'
                    : 'Search the same route and date after ' +
                      value +
                      ' Cairo time, with no upper departure-time limit.';
              setMode(null);
              await onSend(text);
            }}
            className="rounded-xl border border-border p-3"
          >
            {mode === 'date' ? (
              <DatePickr<{ value: string }>
                name="value"
                label={isAr ? 'تاريخ السفر' : 'Travel date'}
                min={today}
                max="9998-12-31"
                disabled={pending}
              />
            ) : (
              <TimePicker<{ value: string }>
                name="value"
                label={isAr ? 'المغادرة بعد' : 'Depart after'}
                disabled={pending}
              />
            )}
            <SubmitButton disabled={pending} className="h-11">
              {isAr ? 'تحديث البحث' : 'Update search'}
            </SubmitButton>
          </Form>
        </div>
      )}
      <Link
        href={allDayHref}
        onClick={onNavigate}
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {isAr ? 'كل رحلات هذا اليوم' : 'All trips for this date'}
      </Link>
    </section>
  );
}
