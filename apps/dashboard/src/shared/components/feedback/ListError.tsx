'use client';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';

export function ListError({
  title,
  description,
  pending,
  onRetry,
}: {
  title: string;
  description: string;
  pending: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations('Common');
  return (
    <div
      role="alert"
      className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-destructive/30 bg-card p-5"
    >
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Button
        variant="outline"
        className="min-h-11"
        disabled={pending}
        onClick={onRetry}
      >
        {t('retry')}
      </Button>
    </div>
  );
}
