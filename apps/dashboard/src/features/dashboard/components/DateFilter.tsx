'use client';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { useRouter } from '@/i18n/navigation';
import { Form, DatePickr, SubmitButton } from '@/shared/components/forms';
import { reportDateSchema } from '../schemas/reportSchema';
const schema = z.object({ date: reportDateSchema });
export function DateFilter({ date }: { date: string }) {
  const t = useTranslations('Dashboard');
  const router = useRouter();
  return (
    <Form
      key={date}
      schema={schema}
      defaultValues={{ date }}
      className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:w-auto lg:min-w-0"
      onSubmit={(values) => {
        router.push('/dashboard?date=' + encodeURIComponent(values.date));
      }}
    >
      <DatePickr<z.infer<typeof schema>>
        name="date"
        fieldClassName="min-w-0 gap-2"
        className="rounded-[12px] lg:h-[50px]"
        label={t('travelDate')}
        min="2000-01-01"
        max="9998-12-31"
      />
      <SubmitButton className="rounded-[10px] px-[22px] sm:w-auto lg:h-[50px]">
        {t('applyDate')}
      </SubmitButton>
    </Form>
  );
}
