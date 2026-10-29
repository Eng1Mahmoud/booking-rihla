'use client';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { PageStatus } from '@/shared/components/feedback/PageStatus';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('StatusPages');
  return (
    <PageStatus
      status={500}
      title={t('errorTitle')}
      description={t('errorDescription')}
      codeLabel={t('code')}
    >
      <Button size="lg" className="rounded-full" onClick={reset}>
        {t('retry')}
      </Button>
      <Button asChild size="lg" variant="outline" className="rounded-full">
        <Link href="/">{t('home')}</Link>
      </Button>
    </PageStatus>
  );
}
