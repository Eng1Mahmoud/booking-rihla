'use client';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Form } from '@/shared/components/forms/Form';
import { FormInput } from '@/shared/components/forms/FormInput';
import { SubmitButton } from '@/shared/components/forms/SubmitButton';
import { recoveryEmailSchema } from '../../schemas/recoverySchema';
import { useForgotPassword } from '../../hooks/useAuth';

export function ForgotPasswordForm({
  returnTo,
  onRequested,
}: {
  returnTo: string;
  onRequested: (email: string) => void;
}) {
  const t = useTranslations('Recovery');
  const forgotPassword = useForgotPassword();
  return (
    <Form
      schema={recoveryEmailSchema}
      defaultValues={{ email: '' }}
      onSubmit={async (values) => {
        await forgotPassword.mutateAsync(values);
        onRequested(values.email);
      }}
    >
      <FormInput<{ email: string }>
        name="email"
        label={t('email')}
        type="email"
        dir="ltr"
        autoComplete="email"
        maxLength={254}
      />
      <SubmitButton pendingText={t('working')}>{t('send')}</SubmitButton>
      <Link
        href={'/reset-password?returnTo=' + encodeURIComponent(returnTo)}
        className="text-center text-sm font-semibold text-primary hover:underline"
      >
        {t('haveCode')}
      </Link>
    </Form>
  );
}
