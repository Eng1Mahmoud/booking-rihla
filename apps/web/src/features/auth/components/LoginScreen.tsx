'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AuthForm } from '@/features/auth/components/AuthForm';
import { safeReturnPath } from '@/features/auth/lib/safeReturnPath';
export function LoginScreen({ returnTo }: { returnTo: string }) {
  const locale = useLocale();
  const { status } = useAuth();
  const t = useTranslations('Auth');
  const safe = safeReturnPath(returnTo);
  useEffect(() => {
    if (status === 'signed-in')
      window.location.replace('/' + locale + (safe === '/' ? '' : safe));
  }, [status, locale, safe]);
  return (
    <section className="auth-screen">
      <div className="auth-intro">
        <h1>{t('welcome')}</h1>
        <p>{t('welcomeText')}</p>
      </div>
      <div className="panel p-7 sm:p-9">
        <AuthForm returnTo={safe} />
      </div>
    </section>
  );
}
