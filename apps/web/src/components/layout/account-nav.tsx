'use client';
import { useLocale, useTranslations } from 'next-intl';
import { UserRound, LogOut } from 'lucide-react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useSession } from '@/providers/session-provider';
import { errorMessage } from '@/lib/browser-api';
import { useState } from 'react';
export function AccountNav() {
  const { user, status, logout } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Auth');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="account-nav">
      {status === 'signed-in' ? (
        <>
          <Link
            href="/bookings"
            className="nav-account"
            aria-label={t('account')}
          >
            <UserRound size={18} />
            <span>{user?.name.split(' ')[0]}</span>
          </Link>
          <button
            type="button"
            className="icon-button"
            disabled={busy}
            aria-label={t('logout')}
            onClick={async () => {
              setBusy(true);
              try {
                await logout();
              } catch (cause) {
                setError(errorMessage(cause, locale));
              } finally {
                setBusy(false);
              }
            }}
          >
            <LogOut size={17} />
          </button>
        </>
      ) : (
        <Link
          href={'/login?returnTo=' + encodeURIComponent(pathname)}
          className="nav-account"
          aria-label={t('login')}
          onClick={(event) => {
            event.preventDefault();
            router.push(
              '/login?returnTo=' +
                encodeURIComponent(pathname + window.location.search),
            );
          }}
        >
          <UserRound size={18} />
          <span>{t('login')}</span>
        </Link>
      )}
      {error && (
        <span role="alert" className="nav-error">
          {error}
        </span>
      )}
    </div>
  );
}
