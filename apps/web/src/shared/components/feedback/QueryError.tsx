'use client';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, Button } from '@/shared/components/ui';

// The feature supplies the message and refetch; this component only renders them.
export function QueryError({
  message,
  onRetry,
  pending = false,
}: {
  message: string;
  onRetry: () => void;
  pending?: boolean;
}) {
  const t = useTranslations('Forms');
  return (
    <Alert className="my-5 border-amber-200 bg-amber-50 text-amber-950">
      <AlertCircle aria-hidden="true" />
      <AlertDescription className="w-full gap-3 text-inherit sm:flex sm:items-center sm:justify-between">
        <p>{message}</p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 bg-card"
          disabled={pending}
          aria-busy={pending}
          onClick={onRetry}
        >
          {t('retry')}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
