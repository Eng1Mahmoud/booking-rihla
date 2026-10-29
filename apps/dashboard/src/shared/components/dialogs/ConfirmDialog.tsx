'use client';
import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';

export function ConfirmDialog({
  open,
  title,
  description,
  children,
  variant = 'default',
  confirmLabel,
  cancelLabel,
  pendingLabel,
  pending = false,
  confirmDisabled = false,
  error,
  onConfirm,
  onCancel,
  onCloseAutoFocus,
}: {
  open: boolean;
  title: ReactNode;
  description: ReactNode;
  children?: ReactNode;
  variant?: 'default' | 'destructive';
  confirmLabel?: string;
  cancelLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
  confirmDisabled?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const locale = useLocale();
  const t = useTranslations('ConfirmDialog');
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onCancel();
      }}
    >
      <AlertDialogContent
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
        onCloseAutoFocus={onCloseAutoFocus}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <AlertDialogTitle className="text-2xl leading-snug font-semibold text-secondary-foreground">
          {title}
        </AlertDialogTitle>
        <AlertDialogDescription className="mt-3 text-sm leading-relaxed wrap-anywhere text-muted-foreground">
          {description}
        </AlertDialogDescription>
        {children}
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-[12px] border border-destructive/30 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <AlertDialogCancel className="min-h-12" disabled={pending}>
            {cancelLabel ?? t('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={variant}
            className="min-h-12"
            disabled={pending || confirmDisabled}
            aria-busy={pending}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {pending
              ? (pendingLabel ?? t('working'))
              : (confirmLabel ?? t('confirm'))}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
