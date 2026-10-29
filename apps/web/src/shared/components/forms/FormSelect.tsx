'use client';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import {
  useFormContext,
  type FieldValues,
  type FieldPath,
} from 'react-hook-form';
import { NativeSelect } from '../ui/native-select';
import { Field, FieldLabel, FieldError } from '../ui/field';
type Props<T extends FieldValues> = Omit<
  ComponentProps<typeof NativeSelect>,
  'name' | 'id'
> & { name: FieldPath<T>; label: ReactNode };
export function FormSelect<T extends FieldValues>({
  name,
  label,
  children,
  className,
  ...props
}: Props<T>) {
  const id = useId();
  const { register, getFieldState, formState } = useFormContext<T>();
  const { error } = getFieldState(name, formState);
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect
        {...props}
        {...register(name)}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? id + '-error' : undefined}
        className={cn('h-12 bg-card text-base', className)}
      >
        {children}
      </NativeSelect>
      {error && <FieldError id={id + '-error'} errors={[error]} />}
    </Field>
  );
}
