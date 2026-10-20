'use client';
import { useLocale, useTranslations } from 'next-intl';
import { UserRound, LogOut } from 'lucide-react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useAuth, useLogout } from '@/features/auth/hooks/useAuth';
import { errorMessage } from '@/shared/lib/apiResult';
import { safeReturnPath } from '@/features/auth/lib/safeReturnPath';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
export function AccountMenu() {
  const { user, status, reloadSession } = useAuth();
  const logout = useLogout();
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Auth');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="relative flex items-center gap-2">
      {status === 'signed-in' ? (
        <>
          <Link
            href="/account"
            className="flex items-center gap-2 text-sm hover:text-primary"
            aria-label={t('account')}
          >
            <UserRound size={18} />
            <span className="hidden sm:inline">{user?.name.split(' ')[0]}</span>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
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
          </Button>
        </>
      ) : status === 'unavailable' ? (
        <Button
          variant="link"
          type="button"
          className="h-auto min-h-11 px-0 py-2 text-primary underline underline-offset-4 whitespace-normal"
          onClick={reloadSession}
        >
          {t('retrySession')}
        </Button>
      ) : (
        <Link
          href={
            '/login?returnTo=' + encodeURIComponent(safeReturnPath(pathname))
          }
          className="flex items-center gap-2 text-sm hover:text-primary"
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
          <span className="hidden sm:inline">{t('login')}</span>
        </Link>
      )}
      {error && (
        <span
          role="alert"
          className="absolute end-0 top-full mt-2 w-60 rounded-lg border bg-card p-3 text-xs text-destructive shadow-sm"
        >
          {error}
        </span>
      )}
    </div>
  );
}
