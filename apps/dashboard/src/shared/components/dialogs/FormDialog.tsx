'use client';
import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Button,
} from '@/shared/components/ui';
import { SubmitButton } from '@/shared/components/forms';

export function FormDialog({
  title,
  description,
  pending,
  onClose,
  onCloseAutoFocus,
  children,
}: {
  title: string;
  description: string;
  pending: boolean;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
  children: ReactNode;
}) {
  const t = useTranslations('Common');
  const locale = useLocale();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={onCloseAutoFocus}
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <div className="mb-2 flex items-start justify-between gap-4">
          <DialogTitle className="text-2xl leading-snug font-semibold text-secondary-foreground">
            {title}
          </DialogTitle>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-11 shrink-0"
              aria-label={t('close')}
              disabled={pending}
            >
              <X aria-hidden="true" />
            </Button>
          </DialogClose>
        </div>
        <DialogDescription className="mb-6 text-sm leading-relaxed text-muted-foreground">
          {description}
        </DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function FormDialogActions({
  pending,
  onCancel,
  submitLabel,
}: {
  pending: boolean;
  onCancel: () => void;
  submitLabel: string;
}) {
  const t = useTranslations('Common');
  return (
    <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="outline"
        className="min-h-12"
        disabled={pending}
        onClick={onCancel}
      >
        {t('cancel')}
      </Button>
      <SubmitButton className="sm:w-auto">{submitLabel}</SubmitButton>
    </div>
  );
}
