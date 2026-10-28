import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PageStatus } from '@booking-bus/ui/page-status';
import { Button } from '@/shared/components/ui/button';
import { StatusPageLayout } from '@/shared/components/feedback/StatusPageLayout';

export default async function NotFound() {
  const t = await getTranslations('StatusPages');
  return (
    <StatusPageLayout>
      <PageStatus
        status={404}
        title={t('notFoundTitle')}
        description={t('notFoundDescription')}
        codeLabel={t('code')}
      >
        <Button asChild size="lg" className="rounded-full">
          <Link href="/">{t('home')}</Link>
        </Button>
      </PageStatus>
    </StatusPageLayout>
  );
}
