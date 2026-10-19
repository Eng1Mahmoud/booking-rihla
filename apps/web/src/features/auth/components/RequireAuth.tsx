'use client';
import { useEffect, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { routeInfo, protectedRoute } from '@/shared/config/routes';
import { usePathname } from '@/i18n/navigation';
import { safeReturnPath } from '@/features/auth/lib/safeReturnPath';
export function RequireAuth({
  children,
  returnTo,
}: {
  children: ReactNode;
  returnTo?: string;
}) {
  const { status, user, reloadSession } = useAuth();
  const pathname = usePathname();
  const rule = protectedRoute(pathname);
  const forbidden =
    status === 'signed-in' && user && rule && !rule.roles.includes(user.role);
  const router = useRouter();
  const t = useTranslations('Auth');
  useEffect(() => {
    if (forbidden) {
      router.replace('/forbidden');
      return;
    }
    if (status !== 'guest') return;
    const path = routeInfo(window.location.pathname).path;
    const destination = safeReturnPath(
      returnTo ?? path + window.location.search + window.location.hash,
    );
    router.replace('/login?returnTo=' + encodeURIComponent(destination));
  }, [status, router, returnTo, pathname, forbidden]);
  if (status === 'unavailable')
    return (
      <div className="notice" role="alert">
        {t('sessionUnavailable')}{' '}
        <button className="text-button" onClick={() => void reloadSession()}>
          {t('retrySession')}
        </button>
      </div>
    );
  if (status !== 'signed-in' || forbidden)
    return (
      <p className="loading-state" role="status">
        {t('checkingSession')}
      </p>
    );
  return children;
}
