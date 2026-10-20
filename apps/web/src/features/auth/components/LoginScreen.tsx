'use client';
import { useTranslations } from 'next-intl';
import { AuthForm } from './AuthForm';
import { safeReturnPath } from '../lib/safeReturnPath';
export function LoginScreen({ returnTo }: { returnTo: string }) {
  const t = useTranslations('Auth');
  return (
    <section className="mx-auto grid w-[calc(100%_-_2rem)] max-w-[980px] gap-8 py-10 md:grid-cols-2 md:items-center md:gap-14 md:py-16">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold leading-relaxed md:text-4xl">
          {t('welcome')}
        </h1>
        <p className="text-muted-foreground">{t('welcomeText')}</p>
      </div>
      <div className="rounded-2xl border bg-card p-6 sm:p-9">
        <AuthForm returnTo={safeReturnPath(returnTo)} />
      </div>
    </section>
  );
}
