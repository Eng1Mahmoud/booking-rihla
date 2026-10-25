'use client';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Form } from '@/shared/components/forms/Form';
import { FormInput } from '@/shared/components/forms/FormInput';
import { SubmitButton } from '@/shared/components/forms/SubmitButton';
import { invokeAction } from '@/shared/lib/apiResult';
import { loginAction } from '../actions/auth.actions';
import { loginSchema, type LoginValues } from '../schemas/loginSchema';
export function LoginForm({ returnTo }: { returnTo: string }) {
  const t = useTranslations('Auth');
  const router = useRouter();
  const client = useQueryClient();
  return (
    <Form
      schema={loginSchema}
      defaultValues={{ email: '', password: '' }}
      onSubmit={async (values) => {
        await invokeAction(() => loginAction(values));
        client.clear();
        router.replace(returnTo);
        router.refresh();
      }}
    >
      <FormInput<LoginValues>
        name="email"
        label={t('email')}
        type="email"
        autoComplete="username"
        dir="ltr"
      />
      <FormInput<LoginValues>
        name="password"
        label={t('password')}
        type="password"
        autoComplete="current-password"
        dir="ltr"
      />
      <SubmitButton>{t('login')}</SubmitButton>
    </Form>
  );
}
