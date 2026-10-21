'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { ResetPasswordForm } from './ResetPasswordForm';

// Like AuthForm, this component chooses the step; each form owns its submission.
export function PasswordRecoveryForm({
  initialStep,
  returnTo,
}: {
  initialStep: 'request' | 'reset';
  returnTo: string;
}) {
  const t = useTranslations('Recovery');
  const [step, setStep] = useState<'request' | 'reset' | 'done'>(initialStep);
  const [requestedEmail, setRequestedEmail] = useState<string | null>(null);
  const loginHref = '/login?returnTo=' + encodeURIComponent(returnTo);
  if (step === 'done')
    return (
      <div className="grid gap-5">
        <div role="status" className="space-y-4">
          <CheckCircle2 size={32} aria-hidden="true" className="text-primary" />
          <h2 className="text-2xl font-semibold">{t('successTitle')}</h2>
          <p className="text-muted-foreground">{t('successNote')}</p>
        </div>
        <Button asChild className="h-12">
          <Link href={loginHref}>{t('backLogin')}</Link>
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
        <ForgotPasswordForm
          returnTo={returnTo}
          onRequested={(email) => {
            setRequestedEmail(email);
            setStep('reset');
          }}
        />
      ) : (
        <ResetPasswordForm
          initialEmail={requestedEmail ?? ''}
          codeSent={requestedEmail !== null}
          onReset={() => setStep('done')}
        />
      )}
      <Link
        href={loginHref}
        className="mt-5 block text-center text-sm font-semibold text-primary hover:underline"
      >
        {t('backLogin')}
      </Link>
    </>
  );
}
