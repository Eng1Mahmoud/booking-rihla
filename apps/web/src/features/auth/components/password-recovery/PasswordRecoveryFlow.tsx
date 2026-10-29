'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Form, FormInput, SubmitButton } from '@/shared/components/forms';
import { Button } from '@/shared/components/ui';
import { useForgotPassword } from '../../hooks/useAuth';
import { recoveryEmailSchema } from '../../schemas/recoverySchema';
import { ResetPasswordForm } from './ResetPasswordForm';

export function PasswordRecoveryFlow({
  initialStep,
}: {
  initialStep: 'request' | 'reset';
}) {
  const t = useTranslations('Recovery');
  const forgotPassword = useForgotPassword();
  const [step, setStep] = useState<'request' | 'reset' | 'done'>(initialStep);
  const [requestedEmail, setRequestedEmail] = useState<string | null>(null);

  if (step === 'done')
    return (
      <div className="grid gap-5">
        <div role="status" className="space-y-4">
          <CheckCircle2 size={32} aria-hidden="true" className="text-primary" />
          <h2 className="text-2xl font-semibold">{t('successTitle')}</h2>
          <p className="text-muted-foreground">{t('successNote')}</p>
        </div>
        <Button asChild className="h-12">
          <Link href="/login">{t('backLogin')}</Link>
        </Button>
      </div>
    );

  return (
    <>
      <h2 className="mb-3 text-2xl font-semibold">
        {t(step === 'request' ? 'requestTitle' : 'resetTitle')}
      </h2>
      <p className="mb-5 text-sm text-muted-foreground">
        {t(step === 'request' ? 'requestNote' : 'resetNote')}
      </p>
      {step === 'request' ? (
        <Form
          schema={recoveryEmailSchema}
          defaultValues={{ email: '' }}
          onSubmit={async (values) => {
            await forgotPassword.mutateAsync(values);
            setRequestedEmail(values.email);
            setStep('reset');
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
            href="/reset-password"
            className="text-center text-sm font-semibold text-primary hover:underline"
          >
            {t('haveCode')}
          </Link>
        </Form>
      ) : (
        <ResetPasswordForm
          initialEmail={requestedEmail ?? ''}
          codeSent={requestedEmail !== null}
          onReset={() => setStep('done')}
        />
      )}
      <Link
        href="/login"
        className="mt-5 block text-center text-sm font-semibold text-primary hover:underline"
      >
        {t('backLogin')}
      </Link>
    </>
  );
}
