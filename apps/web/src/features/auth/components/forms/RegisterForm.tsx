'use client';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
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
      <p className="text-sm leading-7 text-muted-foreground">
        {t.rich('policyNotice', {
          terms: (chunks) => (
            <Link
              href="/terms"
              className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
            >
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link
              href="/privacy"
              className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
            >
              {chunks}
            </Link>
          ),
        })}
      </p>
      <SubmitButton pendingText={t('working')}>{t('register')}</SubmitButton>
    </Form>
  );
}
