'use client';
import { unstable_rethrow } from 'next/navigation';
import {
  useForm,
  FormProvider,
  type DefaultValues,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocale } from 'next-intl';
import type { ReactNode } from 'react';
import { errorMessage } from '@/shared/lib/apiResult';
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
};
// Each form owns one RHF instance; schema input/output stay typed even with transforms.
export function Form<Input extends FieldValues, Output extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className,
  shouldUnregister,
}: Props<Input, Output>) {
  const locale = useLocale();
  const form = useForm<Input, unknown, Output>({
    resolver: zodResolver(schema),
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
              unstable_rethrow(error);
              const message = errorMessage(error, locale);
              form.setError('root.server', { message });
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
