import { BusFront } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from './LanguageSwitcher';
export async function SiteHeader({ accountMenu }: { accountMenu: ReactNode }) {
  const t = await getTranslations('Header');
  return (
    <header className="sticky top-0 z-40 border-b bg-card">
      <div className="mx-auto flex h-18 w-[calc(100%-2rem)] max-w-[1180px] items-center gap-4 md:h-21 md:gap-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-[22px] font-semibold leading-tight text-foreground md:text-[25px]"
          dir="ltr"
          aria-label={t('home')}
        >
          <span className="flex h-10 w-9 items-center justify-center rounded-lg border-[1.5px] border-current md:h-11 md:w-10">
            <BusFront size={24} />
          </span>
          <span>
            Rihla<span className="text-primary">.</span>
            <small className="mt-0.5 block text-right text-[10px] tracking-wider text-muted-foreground">
              رحلة
            </small>
          </span>
        </Link>
        <nav
          className="hidden gap-7 text-sm md:flex"
          aria-label={t('navigation')}
        >
          <Link href="/" className="hover:text-primary">
            {t('search')}
          </Link>
          <Link href="/bookings" className="hover:text-primary">
            {t('bookings')}
          </Link>
        </nav>
        <div className="ms-auto flex items-center gap-4 md:gap-6">
          <LanguageSwitcher />
          {accountMenu}
        </div>
      </div>
    </header>
  );
}
