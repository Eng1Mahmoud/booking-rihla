'use client';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
export function AccountNavigation() {
  const t = useTranslations('Account');
  const pathname = usePathname();
  return (
    <nav className="account-tabs" aria-label={t('navigation')}>
      {[
        { href: '/account', label: t('title') },
        { href: '/bookings', label: t('bookings') },
      ].map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? 'page' : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
