'use client';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
export function AccountNavigation() {
  const t = useTranslations('Account');
  const pathname = usePathname();
  return (
    <nav
      className="mb-7 flex flex-wrap gap-x-6 gap-y-2 border-b"
      aria-label={t('navigation')}
    >
      {[
        { href: '/account', label: t('title') },
        { href: '/bookings', label: t('bookings') },
      ].map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="border-b-[3px] border-transparent px-1 py-3 text-muted-foreground aria-[current=page]:border-primary aria-[current=page]:font-semibold aria-[current=page]:text-foreground"
          aria-current={pathname === href ? 'page' : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
