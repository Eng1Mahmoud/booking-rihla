'use client';
import { useId, type ComponentProps, type ReactNode } from 'react';
import {
  useFormContext,
  type FieldValues,
  type FieldPath,
} from 'react-hook-form';
import {
  NativeSelect,
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from '../ui';
type Props<T extends FieldValues> = Omit<
  ComponentProps<typeof NativeSelect>,
  'name' | 'id'
> & {
  name: FieldPath<T>;
  label: ReactNode;
  description?: ReactNode;
};
export function FormSelect<T extends FieldValues>({
  name,
  label,
  description,
  children,
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
        aria-describedby={
          [description ? id + '-hint' : '', error ? id + '-error' : '']
            .filter(Boolean)
            .join(' ') || undefined
        }
        className="h-12 bg-card text-base"
      >
        {children}
      </NativeSelect>
      {description && (
        <FieldDescription id={id + '-hint'}>{description}</FieldDescription>
      )}
      {error && <FieldError id={id + '-error'} errors={[error]} />}
    </Field>
  );
}
