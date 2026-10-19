'use client';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { AuthForm } from './auth-form';
import { safeReturnPath } from '../safe-return-path';
export function LoginScreen({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const t = useTranslations('Auth');
  const safe = safeReturnPath(returnTo);
  return (
    <section className="auth-screen">
      <div className="auth-intro">
        <h1>{t('welcome')}</h1>
        <p>{t('welcomeText')}</p>
      </div>
      <div className="panel p-7 sm:p-9">
        <AuthForm onSuccess={() => router.replace(safe)} returnTo={safe} />
      </div>
    </section>
  );
}
