'use client';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Form } from '@/shared/components/forms/Form';
import { FormInput } from '@/shared/components/forms/FormInput';
import { SubmitButton } from '@/shared/components/forms/SubmitButton';
import { useLogin } from '../../hooks/useAuth';
import { loginSchema } from '../../schemas/authSchema';
import { safeReturnPath } from '../../lib/safeReturnPath';
import type { LoginInput } from '../../types/auth';
export function LoginForm({ returnTo }: { returnTo: string }) {
  const t = useTranslations('Auth'),
    locale = useLocale(),
    login = useLogin();
  return (
    <Form
      schema={loginSchema}
      defaultValues={{ email: '', password: '' }}
      onSubmit={async (values) => {
        await login.mutateAsync(values);
        window.location.replace('/' + locale + safeReturnPath(returnTo));
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
          '/forgot-password?returnTo=' +
          encodeURIComponent(safeReturnPath(returnTo))
        }
        className="text-center text-sm font-semibold text-primary hover:underline"
      >
        {t('forgotPassword')}
      </Link>
    </Form>
  );
}
