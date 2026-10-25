'use client';
import type { ComponentProps } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Button } from '../ui/button';
import { cn } from '@/shared/lib/cn';
export function SubmitButton({
  children,
  disabled,
  pendingText,
  className,
  ...props
}: ComponentProps<typeof Button> & { pendingText?: string }) {
  const {
    formState: { isSubmitting },
  } = useFormContext();
  const t = useTranslations('Forms');
  return (
    <Button
      {...props}
      type="submit"
      disabled={disabled || isSubmitting}
      aria-busy={isSubmitting}
      className={cn('h-12 w-full', className)}
    >
      {isSubmitting ? (pendingText ?? t('working')) : children}
    </Button>
  );
}
