'use client';
import { useId, useState, type ComponentProps, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import {
  useFormContext,
  type FieldValues,
  type FieldPath,
} from 'react-hook-form';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
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
  const locale = useLocale();
  const t = useTranslations('Auth');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = props.type === 'password';
  // International phone numbers keep their + prefix on the left in every locale.
  const direction = props.dir ?? (props.type === 'tel' ? 'ltr' : undefined);
  const { register, getFieldState, formState } = useFormContext<T>();
  const { error } = getFieldState(name, formState);
  const describedBy =
    [description ? id + '-hint' : '', error ? id + '-error' : '']
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <Field data-invalid={!!error} className={fieldClassName}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative" dir={direction}>
        <Input
          {...props}
          {...register(name)}
          id={id}
          type={isPassword && passwordVisible ? 'text' : props.type}
          dir={direction}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(
            'h-12 bg-card text-base',
            props.type === 'tel' && locale === 'ar' && 'text-right',
            isPassword && 'pe-12',
            className,
          )}
        />
        {isPassword && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute inset-y-0 end-0 size-12 text-muted-foreground"
            aria-label={t(passwordVisible ? 'hidePassword' : 'showPassword')}
            aria-controls={id}
            aria-pressed={passwordVisible}
            disabled={props.disabled || formState.isSubmitting}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {passwordVisible ? (
              <EyeOff aria-hidden="true" />
            ) : (
              <Eye aria-hidden="true" />
            )}
          </Button>
        )}
      </div>
      {description && (
        <FieldDescription id={id + '-hint'}>{description}</FieldDescription>
      )}
      {error && <FieldError id={id + '-error'} errors={[error]} />}
    </Field>
  );
}
