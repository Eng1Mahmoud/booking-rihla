'use client';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui';
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('Forms');
  return (
    <section
      role="alert"
      className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6 xl:px-[27px]"
    >
      <h1 className="text-xl font-semibold">{t('unavailable')}</h1>
      <Button className="mt-5 min-h-11" onClick={reset}>
        {t('retry')}
      </Button>
    </section>
  );
}
