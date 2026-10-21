import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AccountNavigation } from '@/features/account/components/AccountNavigation';
import { AccountProfile } from '@/features/account/components/AccountProfile';
import { AccountSessions } from '@/features/account/components/AccountSessions';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AccountPage() {
  const t = await getTranslations('Account');
  return (
    <div className="mx-auto w-[calc(100%-28px)] max-w-[1180px] md:w-[calc(100%-40px)] pt-6 pb-10 md:pt-9 md:pb-16">
      <AccountNavigation />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-5">
        <h1 className="text-[26px] font-semibold md:text-[29px]">
          {t('title')}
        </h1>
      </div>
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <AccountProfile />
        <AccountSessions />
      </div>
    </div>
  );
}
