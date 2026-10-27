'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
  DatePickr as CalendarPickr,
  TimePicker as ClockPicker,
  type PickerProps,
} from '@booking-bus/ui/date-pickr';

type Props = Omit<PickerProps, 'locale' | 'labels'>;

function usePickerLocale() {
  const locale = useLocale();
  const t = useTranslations('DatePicker');
  return {
    locale,
    labels: {
      chooseDate: t('chooseDate'),
      chooseTime: t('chooseTime'),
      hour: t('hour'),
      minute: t('minute'),
      second: t('second'),
      period: t('period'),
      am: t('am'),
      pm: t('pm'),
      today: t('today'),
      clear: t('clear'),
      close: t('close'),
      time: t('time'),
    },
  };
}

export function DatePickr(props: Props) {
  const localized = usePickerLocale();
  return <CalendarPickr {...props} {...localized} />;
}

export function TimePicker(props: Props) {
  const localized = usePickerLocale();
  return <ClockPicker {...props} {...localized} />;
}
