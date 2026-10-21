'use client';
import { useLocale, useTranslations } from 'next-intl';
import { z } from 'zod';
import { Form } from '@/shared/components/forms/Form';
import { FormInput } from '@/shared/components/forms/FormInput';
import { SubmitButton } from '@/shared/components/forms/SubmitButton';
import { registerSchema } from '../../schemas/authSchema';
import { useRegister } from '../../hooks/useAuth';
type Values = z.input<typeof registerSchema>;
export function RegisterForm({
  onRegistered,
}: {
  onRegistered: (challenge: { email: string; verificationId: string }) => void;
}) {
  const t = useTranslations('Auth'),
    locale = useLocale(),
    registration = useRegister();
  return (
    <Form
      schema={registerSchema}
      defaultValues={{ name: '', email: '', phone: '', password: '' }}
      onSubmit={async (values) => {
        const data = await registration.mutateAsync({
          ...values,
          language: locale,
        });
        onRegistered({
          email: values.email,
          verificationId: data.verificationId,
        });
      }}
    >
      <FormInput<Values>
        name="name"
        label={t('name')}
        autoComplete="name"
        maxLength={100}
      />
      <FormInput<Values>
        name="email"
        label={t('email')}
        type="email"
        dir="ltr"
        autoComplete="email"
        maxLength={254}
      />
      <FormInput<Values>
        name="phone"
        label={t('phone')}
        type="tel"
        dir="ltr"
        autoComplete="tel"
        placeholder="+201xxxxxxxxx"
        description={t('internationalPhone')}
      />
      <FormInput<Values>
        name="password"
        label={t('password')}
        type="password"
        autoComplete="new-password"
        maxLength={128}
        description={t('passwordHint')}
      />
      <SubmitButton pendingText={t('working')}>{t('register')}</SubmitButton>
    </Form>
  );
}
