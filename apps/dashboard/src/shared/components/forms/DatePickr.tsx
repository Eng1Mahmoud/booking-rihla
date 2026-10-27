'use client';

import { useId, type ReactNode } from 'react';
import {
  useController,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { useLocale, useTranslations } from 'next-intl';
import {
  DatePickr as CalendarPickr,
  TimePicker as ClockPicker,
  type PickerProps,
} from '@booking-bus/ui/date-pickr';
import { Field, FieldLabel, FieldDescription, FieldError } from '../ui/field';

type Props<T extends FieldValues> = Omit<
  PickerProps,
  'name' | 'value' | 'onValueChange' | 'locale' | 'labels' | 'id'
> & {
  name: FieldPath<T>;
  label: ReactNode;
  description?: ReactNode;
  fieldClassName?: string;
};

function PickerField<T extends FieldValues>({
  name,
  label,
  description,
  fieldClassName,
  kind,
  disabled,
  ...props
}: Props<T> & { kind: 'date' | 'time' }) {
  const id = useId();
  const locale = useLocale();
  const t = useTranslations('DatePicker');
  const { field, fieldState, formState } = useController<T>({ name });
  const Picker = kind === 'date' ? CalendarPickr : ClockPicker;
  const describedBy =
    [description ? id + '-hint' : '', fieldState.error ? id + '-error' : '']
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <Field data-invalid={!!fieldState.error} className={fieldClassName}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Picker
        {...props}
        ref={field.ref}
        id={id}
        name={name}
        value={String(field.value ?? '')}
        onValueChange={field.onChange}
        onBlur={field.onBlur}
        disabled={disabled || formState.isSubmitting}
        aria-invalid={!!fieldState.error}
        aria-describedby={describedBy}
        locale={locale}
        labels={{
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
        }}
      />
      {description && (
        <FieldDescription id={id + '-hint'}>{description}</FieldDescription>
      )}
      {fieldState.error && (
        <FieldError id={id + '-error'} errors={[fieldState.error]} />
      )}
    </Field>
  );
}

export function DatePickr<T extends FieldValues>(props: Props<T>) {
  return <PickerField {...props} kind="date" />;
}

export function TimePicker<T extends FieldValues>(props: Props<T>) {
  return <PickerField {...props} kind="time" />;
}
