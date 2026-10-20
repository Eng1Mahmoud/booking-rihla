'use client';
import { useTranslations } from 'next-intl';
import { AuthForm } from '@/features/auth/components/AuthForm';
import { safeReturnPath } from '@/features/auth/lib/safeReturnPath';
export function LoginScreen({ returnTo }: { returnTo: string }) {
  const t = useTranslations('Auth');
  const safe = safeReturnPath(returnTo);
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
