import { AccountLayout } from '@/features/account/components/AccountLayout';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { getTranslations } from 'next-intl/server';

export default async function LoadingPayments() {
  const t = await getTranslations('PaymentHistory');
  return (
    <AccountLayout>
      <div role="status" aria-label={t('loading')} className="space-y-5">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-5 w-96 max-w-full" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    </AccountLayout>
  );
}
