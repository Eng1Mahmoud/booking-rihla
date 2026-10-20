'use client';
import { useLocale, useTranslations } from 'next-intl';
import { UserRound, LogOut } from 'lucide-react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useAuth, useLogout } from '@/features/auth/hooks/useAuth';
import { errorMessage } from '@/shared/lib/apiResult';
import { safeReturnPath } from '@/features/auth/lib/safeReturnPath';
import { useState } from 'react';
export function AccountNav() {
  const { user, status, reloadSession } = useAuth();
  const logout = useLogout();
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
            href="/account"
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
                await logout.mutateAsync(false);
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
      ) : status === 'unavailable' ? (
        <button type="button" className="text-button" onClick={reloadSession}>
          {t('retrySession')}
        </button>
      ) : (
        <Link
          href={
            '/login?returnTo=' + encodeURIComponent(safeReturnPath(pathname))
          }
          className="nav-account"
          aria-label={t('login')}
          onClick={(event) => {
            event.preventDefault();
            const destination =
              pathname === '/login'
                ? new URLSearchParams(window.location.search).get('returnTo')
                : pathname + window.location.search + window.location.hash;
            router.push(
              '/login?returnTo=' +
                encodeURIComponent(safeReturnPath(destination)),
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
