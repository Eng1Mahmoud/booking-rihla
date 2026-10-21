import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { UserRound } from 'lucide-react';
import { AccountNavigation } from '@/features/account/components/AccountNavigation';
import { AccountSessions } from '@/features/account/components/AccountSessions';
import { getCurrentUser } from '@/features/auth/lib/auth.server';
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function AccountPage() {
  // The private layout checks the same cached user and handles expired sessions/outages.
  const user = await getCurrentUser().catch(() => null);
  if (!user) return null;
  const t = await getTranslations('Account');
  return (
    <div className="mx-auto w-[calc(100%-28px)] max-w-[1180px] md:w-[calc(100%-40px)] pt-6 pb-10 md:pt-9 md:pb-16">
      <>
        <AccountNavigation />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-5">
          <h1 className="text-[26px] font-semibold md:text-[29px]">
            {t('title')}
          </h1>
        </div>
        <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <section
            className="rounded-2xl border bg-card min-w-0 p-[22px] md:p-7"
            aria-labelledby="profile-title"
          >
            <UserRound
              className="mb-3.5 text-primary"
              size={26}
              aria-hidden="true"
            />
            <h2 className="mb-5 text-[21px] font-semibold" id="profile-title">
              {t('profile')}
            </h2>
            <dl className="m-0">
              {(['name', 'email', 'phone'] as const).map((field) => (
                <div
                  key={field}
                  className="border-b py-4 last:border-0 last:pb-0"
                >
                  <dt className="mb-1.5 text-sm text-muted-foreground">
                    {t(field)}
                  </dt>
                  <dd className="m-0 wrap-anywhere">
                    <bdi>{user[field]}</bdi>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <AccountSessions />
        </div>
      </>
    </div>
  );
}
