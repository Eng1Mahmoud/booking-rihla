import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { CircleHelp } from 'lucide-react';
import { AccountNavigation } from './AccountNavigation';

export async function AccountLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('Account');
  return (
    <div className="mx-auto w-[calc(100%-2rem)] max-w-[1180px] py-7 md:py-10 lg:py-12">
      <div className="grid min-w-0 gap-7 lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-10">
        <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <p className="mb-4 hidden px-4 text-lg font-semibold lg:block">
            {t('navigation')}
          </p>
          <AccountNavigation />
          <Link
            href="/faqs"
            className="mt-8 hidden items-center gap-3 border-t px-4 pt-6 text-sm text-muted-foreground hover:text-primary lg:flex"
          >
            <CircleHelp size={18} aria-hidden="true" />
            {t('help')}
          </Link>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
