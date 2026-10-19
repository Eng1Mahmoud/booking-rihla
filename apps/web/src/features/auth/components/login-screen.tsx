'use client';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { AuthForm } from './auth-form';
export function LoginScreen({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const t = useTranslations('Auth');
  let safe = '/';
  try {
    const candidate = new URL(returnTo, 'https://rihla.invalid');
    if (candidate.origin === 'https://rihla.invalid')
      safe = candidate.pathname + candidate.search + candidate.hash;
  } catch {
    /* Use home for an invalid return path. */
  }
  return (
    <section className="auth-screen">
      <div className="auth-intro">
        <h1>{t('welcome')}</h1>
        <p>{t('welcomeText')}</p>
      </div>
      <div className="panel p-7 sm:p-9">
        <AuthForm onSuccess={() => router.replace(safe)} />
      </div>
    </section>
  );
}
