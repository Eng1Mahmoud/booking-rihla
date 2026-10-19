import { BusFront } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from './language-switcher';
import { AccountNav } from './account-nav';
export async function SiteHeader() {
  const t = await getTranslations('Header');
  return (
    <header className="site-header">
      <div className="container-shell header-inner">
        <Link href="/" className="brand" aria-label={t('home')}>
          <span className="brand-symbol">
            <BusFront size={24} />
          </span>
          <span>
            Rihla<span className="brand-dot">.</span>
            <small>رحلة</small>
          </span>
        </Link>
        <nav className="header-nav" aria-label={t('navigation')}>
          <Link href="/" className="nav-link">
            {t('search')}
          </Link>
          <Link href="/bookings" className="nav-link">
            {t('bookings')}
          </Link>
        </nav>
        <div className="header-actions">
          <LanguageSwitcher />
          <AccountNav />
        </div>
      </div>
    </header>
  );
}
