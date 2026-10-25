'use client';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import {
  useFormContext,
  type FieldValues,
  type FieldPath,
} from 'react-hook-form';
import { Input } from '../ui/input';
import { Field, FieldLabel, FieldDescription, FieldError } from '../ui/field';
type Props<T extends FieldValues> = Omit<
  ComponentProps<typeof Input>,
  'name' | 'id'
> & {
  name: FieldPath<T>;
  label: ReactNode;
  description?: ReactNode;
  fieldClassName?: string;
};
export function FormInput<T extends FieldValues>({
  name,
  label,
  description,
  fieldClassName,
  className,
  ...props
}: Props<T>) {
  const id = useId();
  const { register, getFieldState, formState } = useFormContext<T>();
  const { error } = getFieldState(name, formState);
  const describedBy =
    [description ? id + '-hint' : '', error ? id + '-error' : '']
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <Field data-invalid={!!error} className={fieldClassName}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        {...props}
        {...register(name)}
        id={id}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={cn('h-12 bg-card text-base', className)}
      />
      {description && (
        <FieldDescription id={id + '-hint'}>{description}</FieldDescription>
      )}
      {error && <FieldError id={id + '-error'} errors={[error]} />}
    </Field>
  );
}
