'use client';
import { notFound } from 'next/navigation';
import { useLocale } from 'next-intl';
import { ApiError, errorMessage } from '@/shared/lib/apiResult';
import { ListError } from '@/shared/components/feedback/ListError';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { SubmitButton } from '@/shared/components/forms/SubmitButton';

export function ContentPage({
  title,
  description,
  backHref,
  pending = false,
  children,
}: {
  title: string;
  description: string;
  backHref: string;
  pending?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations('Common');
  return (
    <section className="mx-auto w-full min-w-0 max-w-4xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl leading-tight font-bold tracking-tight">
            {title}
          </h1>
          <p className="mt-2 max-w-[65ch] text-sm leading-7 text-muted-foreground">
            {description}
          </p>
        </div>
        {pending ? (
          <Button variant="outline" disabled className="min-h-11 shrink-0">
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            {t('backToList')}
          </Button>
        ) : (
          <Button asChild variant="outline" className="min-h-11 shrink-0">
            <Link href={backHref} prefetch={false}>
              <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
              {t('backToList')}
            </Link>
          </Button>
        )}
      </div>
      <div className="min-w-0 rounded-2xl border bg-card p-5 sm:p-7">
        {children}
      </div>
    </section>
  );
}
export function PageFormActions({
  pending,
  backHref,
  submitLabel,
}: {
  pending: boolean;
  backHref: string;
  submitLabel: string;
}) {
  const t = useTranslations('Common');
  return (
    <div className="mt-3 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
      {pending ? (
        <Button type="button" variant="outline" disabled className="min-h-12">
          {t('cancel')}
        </Button>
      ) : (
        <Button asChild variant="outline" className="min-h-12">
          <Link href={backHref} prefetch={false}>
            {t('cancel')}
          </Link>
        </Button>
      )}
      <SubmitButton className="sm:w-auto" disabled={pending}>
        {submitLabel}
      </SubmitButton>
    </div>
  );
}

// Shared feedback for page queries; request and mutation logic stay in the feature.
export function PageQueryState({
  query,
}: {
  query: {
    isPending: boolean;
    isFetching: boolean;
    error: unknown;
    refetch: () => unknown;
  };
}) {
  const locale = useLocale();
  const t = useTranslations('Common');
  if (query.error instanceof ApiError && query.error.status === 404) notFound();
  if (query.isPending)
    return (
      <div role="status" aria-label={t('loading')} className="grid gap-4">
        <span className="sr-only">{t('loading')}</span>
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="h-12 animate-pulse rounded-md bg-muted motion-reduce:animate-none"
          />
        ))}
      </div>
    );
  return (
    <ListError
      title={t('readFailed')}
      description={errorMessage(query.error, locale)}
      pending={query.isFetching}
      onRetry={() => {
        void query.refetch();
      }}
    />
  );
}
