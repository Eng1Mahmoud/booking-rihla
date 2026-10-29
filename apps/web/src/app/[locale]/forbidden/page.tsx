import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PageStatus } from '@/shared/components/feedback';
import { Button } from '@/shared/components/ui';

export const metadata = { robots: { index: false, follow: false } };

export default async function ForbiddenPage() {
  const t = await getTranslations('StatusPages');
  return (
    <PageStatus
      status={403}
      title={t('forbiddenTitle')}
      description={t('forbiddenDescription')}
      codeLabel={t('code')}
    >
      <Button asChild size="lg" className="rounded-full">
        <Link href="/">{t('home')}</Link>
      </Button>
      <Button asChild size="lg" variant="outline" className="rounded-full">
        <Link href="/bookings">{t('bookings')}</Link>
      </Button>
    </PageStatus>
  );
}
