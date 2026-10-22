'use client';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { accountLinks } from '../accountLinks';

export function AccountNavigation() {
  const t = useTranslations('Account');
  const pathname = usePathname();
  const navigation = useRef<HTMLElement>(null);
  useEffect(() => {
    // Keep the active tab visible in the horizontal mobile navigation.
    navigation.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [pathname]);
  return (
    <nav
      ref={navigation}
      aria-label={t('navigation')}
      className="flex min-w-0 gap-1 overflow-x-auto border-b pb-3 lg:flex-col lg:overflow-visible lg:border-0 lg:pb-0"
    >
      {accountLinks.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={
            pathname === href ||
            (href === '/bookings' && pathname.startsWith('/bookings/'))
              ? 'page'
              : undefined
          }
          className="flex min-h-12 shrink-0 items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground aria-[current=page]:bg-secondary aria-[current=page]:text-primary"
        >
          <Icon size={18} aria-hidden="true" />
          <span>{t(label)}</span>
        </Link>
      ))}
    </nav>
  );
}
