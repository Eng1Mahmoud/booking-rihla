import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PageStatus } from '@booking-bus/ui/page-status';
import { Button } from '@/shared/components/ui/button';
import { SignOutButton } from '@/features/auth/components/SignOutButton';
import { StatusPageLayout } from '@/shared/components/feedback/StatusPageLayout';

export const metadata = { robots: { index: false, follow: false } };

export default async function ForbiddenPage() {
  const t = await getTranslations('StatusPages');
  return (
    <StatusPageLayout>
      <PageStatus
        status={403}
        title={t('forbiddenTitle')}
        description={t('forbiddenDescription')}
        codeLabel={t('code')}
      >
        <Button asChild size="lg" className="rounded-full">
          <Link href="/">{t('home')}</Link>
        </Button>
        <SignOutButton />
      </PageStatus>
    </StatusPageLayout>
  );
}
