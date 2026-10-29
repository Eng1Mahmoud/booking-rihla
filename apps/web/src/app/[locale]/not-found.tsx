import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PageStatus } from '@/shared/components/feedback/PageStatus';
import { Button } from '@/shared/components/ui/button';

export default async function NotFound() {
  const t = await getTranslations('StatusPages');
  return (
    <PageStatus
      status={404}
      title={t('notFoundTitle')}
      description={t('notFoundDescription')}
      codeLabel={t('code')}
    >
      <Button asChild size="lg" className="rounded-full">
        <Link href="/#trip-search-title">{t('searchTrips')}</Link>
      </Button>
      <Button asChild size="lg" variant="outline" className="rounded-full">
        <Link href="/">{t('home')}</Link>
      </Button>
    </PageStatus>
  );
}
