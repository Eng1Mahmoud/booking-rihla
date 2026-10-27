import type { ReactNode } from 'react';
import { BusFront, ExternalLink } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/shared/components/layout/LanguageSwitcher';
import { StaffAccountMenu } from '@/features/auth/components/StaffAccountMenu';
import type { AuthUser } from '@/features/auth/types/auth';
import { DashboardNavigation } from './DashboardNavigation';
export async function DashboardShell({
  user,
  children,
}: {
  user: AuthUser;
  children: ReactNode;
}) {
  const t = await getTranslations('Dashboard');
  // Configured public website URL only; never expose the API URL or credentials.
  const website =
    (process.env.PASSENGER_SITE_URL || 'http://127.0.0.1:3000').replace(
      /\/$/,
      '',
    ) +
    '/' +
    (await getLocale());
  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[256px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
      <a
        href="#dashboard-main"
        className="fixed -top-[100px] start-4 z-100 rounded-[8px] border-2 border-primary bg-card px-5 py-3 focus:top-3"
      >
        {t('skip')}
      </a>
      <aside className="dashboard-scrollbar hidden lg:bg-secondary-foreground lg:sticky lg:top-0 lg:block lg:h-dvh lg:overflow-y-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-3 px-[26px] pt-6 pb-[34px] text-white"
          dir="ltr"
          aria-label={t('overview')}
        >
          <span className="grid size-14 place-items-center rounded-full bg-primary">
            <BusFront className="size-[30px]" aria-hidden="true" />
          </span>
          <strong className="text-[29px] leading-[1.2]">
            Rihla.
            <small className="mt-[3px] block text-end text-[11px] font-normal">
              رحلة
            </small>
          </strong>
        </Link>
        <DashboardNavigation
          website={website}
          superAdmin={user.role === 'SUPER_ADMIN'}
          staffOnly={user.role === 'STAFF'}
        />
        <a
          href={website}
          className="mx-6 mt-[38px] flex min-h-14 items-center gap-4 border-t border-[#466071] py-5 text-[14px] text-white"
        >
          <ExternalLink className="size-[21px] shrink-0" aria-hidden="true" />
          {t('backWebsite')}
        </a>
      </aside>
      <div className="min-w-0">
        <header className="flex min-h-[82px] items-center border-b bg-card px-6 py-3.5 xl:px-[34px]">
          <div className="lg:hidden">
            <DashboardNavigation
              website={website}
              superAdmin={user.role === 'SUPER_ADMIN'}
              staffOnly={user.role === 'STAFF'}
            />
          </div>
          <Link
            href="/dashboard"
            dir="ltr"
            className="ms-2 text-xl font-semibold sm:hidden"
          >
            Rihla.
          </Link>
          <div className="ms-auto flex min-w-0 items-center gap-3 sm:gap-5">
            <div className="flex min-h-11 items-center">
              <LanguageSwitcher />
            </div>
            <StaffAccountMenu />
          </div>
        </header>
        <main
          id="dashboard-main"
          className="min-w-0 px-4 py-7 md:px-[34px] md:py-[30px]"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
