'use client';
import {
  useForm,
  FormProvider,
  type DefaultValues,
  type FieldValues,
  type FieldPath,
  type UseFormReturn,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { ApiError, errorMessage } from '@/shared/lib/apiResult';
import { cn } from '@/shared/lib/cn';
import { Alert, AlertDescription } from '../ui/alert';

type Props<Input extends FieldValues, Output extends FieldValues> = {
  schema: z.ZodType<Output, Input>;
  defaultValues: DefaultValues<Input>;
  onSubmit: (values: Output) => void | Promise<void>;
  children:
    ReactNode | ((form: UseFormReturn<Input, unknown, Output>) => ReactNode);
  className?: string;
  shouldUnregister?: boolean;
  serverErrorFields?: Record<string, FieldPath<Input>[]>;
};
// Each form owns one RHF instance; schema input/output stay typed even with transforms.
export function Form<Input extends FieldValues, Output extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className,
  shouldUnregister,
  serverErrorFields,
}: Props<Input, Output>) {
  const locale = useLocale();
  const t = useTranslations('Forms');
  const form = useForm<Input, unknown, Output>({
    resolver: zodResolver(schema, {
      error: (issue) => {
        const messageKey =
          issue.code === 'custom' ? issue.params?.messageKey : undefined;
        if (
          issue.input === '' ||
          issue.input === undefined ||
          issue.input === null
        )
          return t('required');
        if (typeof messageKey === 'string' && t.has(messageKey))
          return t(messageKey);
        if (issue.code === 'invalid_format') {
          if (issue.format === 'email') return t('email');
          if (issue.format === 'uuid') return t('selection');
          if (issue.format === 'date') return t('date');
          if (issue.format === 'datetime') return t('dateTime');
        }
        if (issue.code === 'invalid_value') return t('selection');
        if (issue.code === 'invalid_type' && issue.expected === 'int')
          return t('wholeNumber');
        if (issue.code === 'too_small') {
          const key =
            issue.origin === 'string'
              ? 'minLength'
              : issue.origin === 'array'
                ? 'minItems'
                : 'minValue';
          return t(key, { value: String(issue.minimum) });
        }
        if (issue.code === 'too_big') {
          const key =
            issue.origin === 'string'
              ? 'maxLength'
              : issue.origin === 'array'
                ? 'maxItems'
                : 'maxValue';
          return t(key, { value: String(issue.maximum) });
        }
        return t('invalid');
      },
    }),
    defaultValues,
    mode: 'onTouched',
    shouldUnregister,
  });
  return (
    <FormProvider {...form}>
      <form
        noValidate
        className={cn('grid gap-4', className)}
        onSubmit={(event) => {
          form.clearErrors('root');
          void form.handleSubmit(async (values) => {
            try {
              await onSubmit(values);
            } catch (error) {
              const message = errorMessage(error, locale);
              const fields =
                error instanceof ApiError
                  ? serverErrorFields?.[error.code]
                  : undefined;
              if (fields?.length) {
                fields.forEach((field, index) =>
                  form.setError(
                    field,
                    { type: 'server', message },
                    { shouldFocus: index === 0 },
                  ),
                );
                requestAnimationFrame(() => form.setFocus(fields[0]));
              } else {
                form.setError('root.server', { message });
              }
            }
          })(event);
        }}
      >
        {typeof children === 'function' ? children(form) : children}
        {form.formState.errors.root?.server && (
          <Alert variant="destructive">
            <AlertDescription>
              {form.formState.errors.root.server.message}
            </AlertDescription>
          </Alert>
        )}
      </form>
    </FormProvider>
  );
}
