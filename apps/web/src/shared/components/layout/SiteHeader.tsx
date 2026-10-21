import { BusFront } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from './LanguageSwitcher';
export async function SiteHeader({
  accountMenu,
  navigation,
}: {
  accountMenu: ReactNode;
  navigation: ReactNode;
}) {
  const t = await getTranslations('Header');
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-card/95 backdrop-blur-xl">
      <div className="mx-auto flex h-19 w-[calc(100%-2rem)] max-w-[1240px] items-center gap-3 lg:h-22 lg:gap-7 xl:gap-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-[24px] font-semibold leading-tight text-foreground md:text-[25px]"
          dir="ltr"
          aria-label={t('home')}
        >
          <span className="flex h-10 w-9 items-center justify-center rounded-xl bg-primary text-white md:h-11 md:w-10">
            <BusFront size={24} />
          </span>
          <span>
            Rihla<span className="text-primary">.</span>
            <small className="mt-0.5 block text-right text-[10px] tracking-wider text-muted-foreground">
              رحلة
            </small>
          </span>
        </Link>
        {navigation}
        <div className="ms-auto flex items-center gap-4 md:gap-6">
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>
          {accountMenu}
        </div>
      </div>
    </header>
  );
}
