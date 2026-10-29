'use client';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Form, FormInput, SubmitButton } from '@/shared/components/forms';
import { useLogin } from '../../hooks/useAuth';
import { loginSchema } from '../../schemas/authSchema';
import type { LoginInput } from '../../types/auth';

export function LoginForm({ returnTo = '/' }: { returnTo?: string }) {
  const t = useTranslations('Auth'),
    locale = useLocale(),
    login = useLogin();
  const destination =
    returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
  return (
    <Form
      schema={loginSchema}
      defaultValues={{ email: '', password: '' }}
      onSubmit={async (values) => {
        await login.mutateAsync(values);
        window.location.replace(
          '/' + locale + (destination === '/' ? '' : destination),
        );
      }}
    >
      <FormInput<LoginInput>
        name="email"
        label={t('email')}
        type="email"
        dir="ltr"
        autoComplete="email"
        maxLength={254}
      />
      <FormInput<LoginInput>
        name="password"
        label={t('password')}
        type="password"
        autoComplete="current-password"
        maxLength={128}
      />
      <SubmitButton pendingText={t('working')}>{t('login')}</SubmitButton>
      <Link
        href={
          destination === '/'
            ? '/forgot-password'
            : '/forgot-password?returnTo=' + encodeURIComponent(destination)
        }
        className="text-center text-sm font-semibold text-primary hover:underline"
      >
        {t('forgotPassword')}
      </Link>
    </Form>
  );
}
