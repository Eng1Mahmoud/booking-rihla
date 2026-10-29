'use client';
import { useId, type ReactNode } from 'react';
import {
  useFormContext,
  type FieldValues,
  type FieldPath,
} from 'react-hook-form';
import { cn } from '@/shared/lib/cn';
import { FieldError } from '../ui/field';

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  label: ReactNode;
  options: { value: string; label: ReactNode; disabled?: boolean }[];
  disabled?: boolean;
  className?: string;
};

export function FormCheckboxGroup<T extends FieldValues>({
  name,
  label,
  options,
  disabled,
  className,
}: Props<T>) {
  const id = useId();
  const { register, getFieldState, formState } = useFormContext<T>();
  const { error } = getFieldState(name, formState);
  const errorId = error ? id + '-error' : undefined;

  // Checkboxes sharing a name collect the selected values into one array.
  return (
    <fieldset
      disabled={disabled}
      className={cn('grid gap-2', className)}
      aria-invalid={!!error}
      aria-describedby={errorId}
    >
      <legend className="mb-3 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-4">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 items-center gap-2 text-sm"
          >
            <input
              type="checkbox"
              value={option.value}
              disabled={option.disabled}
              {...register(name)}
              aria-invalid={!!error}
              aria-describedby={errorId}
              className="size-5 accent-primary"
            />
            {option.label}
          </label>
        ))}
      </div>
      {error && <FieldError id={errorId} errors={[error]} />}
    </fieldset>
  );
}
