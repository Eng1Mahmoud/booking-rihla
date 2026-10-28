import { getLocale, getTranslations } from 'next-intl/server';
import { RotateCw } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { PageStatus } from '@booking-bus/ui/page-status';
import { Button } from '@/shared/components/ui/button';
import { StatusPageLayout } from '@/shared/components/feedback/StatusPageLayout';
import { getSessionRetryPath } from '@/shared/lib/sessionRetryPath';

export const metadata = { robots: { index: false, follow: false } };

export default async function ServiceUnavailablePage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const t = await getTranslations('StatusPages');
  const locale = await getLocale();
  const retryPath = getSessionRetryPath((await searchParams).returnTo, locale);

  return (
    <StatusPageLayout>
      <PageStatus
        status={503}
        title={t('sessionTitle')}
        description={t('sessionDescription')}
        codeLabel={t('code')}
      >
        <Button asChild size="lg" className="rounded-full">
          <a href={retryPath}>
            <RotateCw aria-hidden="true" />
            {t('retry')}
          </a>
        </Button>
        <Button asChild size="lg" variant="outline" className="rounded-full">
          <Link href="/">{t('home')}</Link>
        </Button>
      </PageStatus>
    </StatusPageLayout>
  );
}
