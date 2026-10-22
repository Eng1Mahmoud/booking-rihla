import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AccountLayout } from '@/features/account/components/AccountLayout';
import { AccountProfile } from '@/features/account/components/AccountProfile';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AccountPage() {
  const t = await getTranslations('Account');
  return (
    <AccountLayout>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold md:text-3xl">{t('title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('intro')}</p>
      </div>
      <AccountProfile />
    </AccountLayout>
  );
}
