'use client';
import { useLocale } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { Link } from '@/i18n/navigation';
import { ApiError, errorLinks, errorMessage } from '@/shared/lib/apiResult';

export function ErrorNotice({
  error,
  onRetry,
  retryLabel,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  const locale = useLocale();
  const message = errorMessage(error, locale);
  const cta =
    error instanceof ApiError ? errorLinks.get(error.code) : undefined;
  const ar = locale.startsWith('ar');

  return (
    <div
      role="alert"
      className={
        className ??
        'rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-950'
      }
    >
      <p>{message}</p>
      {(onRetry || cta) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {onRetry && (
            <Button
              variant="link"
              type="button"
              className="h-auto min-h-11 px-0 py-1 text-primary underline underline-offset-4"
              onClick={onRetry}
            >
              {retryLabel ?? (ar ? 'حاول مجددًا' : 'Try again')}
            </Button>
          )}
          {cta && (
            <Button
              variant="link"
              className="h-auto min-h-11 px-0 py-1 text-primary underline underline-offset-4"
              asChild
            >
              <Link href={cta.href}>{ar ? cta.labelAr : cta.labelEn}</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
