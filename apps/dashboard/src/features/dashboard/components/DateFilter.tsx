'use client';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Form } from '@/shared/components/forms/Form';
import { DatePickr } from '@/shared/components/forms/DatePickr';
import { SubmitButton } from '@/shared/components/forms/SubmitButton';
import { createReportDateFormSchema } from '../schemas/reportSchema';
export function DateFilter({ date }: { date: string }) {
  const t = useTranslations('Dashboard');
  const formMessages = useTranslations('Forms');
  const router = useRouter();
  return (
    <Form
      key={date}
      schema={createReportDateFormSchema(formMessages)}
      defaultValues={{ date }}
      className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:w-auto lg:min-w-0"
      onSubmit={(values) => {
        router.push('/dashboard?date=' + encodeURIComponent(values.date));
      }}
    >
      <DatePickr
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
