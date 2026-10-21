'use client';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useLocale, useTranslations } from 'next-intl';
import { SubmitButton } from '@/shared/components/forms/SubmitButton';
import { Button } from '@/shared/components/ui/button';
import { errorMessage } from '@/shared/lib/apiResult';
import { useForgotPassword } from '../../hooks/useAuth';
import {
  recoveryEmailSchema,
  type RecoveryValues,
} from '../../schemas/recoverySchema';

export function ResetPasswordActions({ codeSent }: { codeSent: boolean }) {
  // Form provides the same form instance to its fields and buttons.
  const form = useFormContext<RecoveryValues>();
  const t = useTranslations('Recovery');
  const locale = useLocale();
  const resendCode = useForgotPassword();
  const [cooldown, setCooldown] = useState(codeSent ? 60 : 0);
  const [message, setMessage] = useState(codeSent ? t('requested') : '');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function resend() {
    const parsed = recoveryEmailSchema.safeParse({
      email: form.getValues('email'),
    });
    if (!parsed.success) {
      form.setError('email', { message: t('invalidEmail') });
      form.setFocus('email');
      return;
    }
    form.clearErrors('email');
    form.clearErrors('root');
    setMessage('');
    try {
      await resendCode.mutateAsync(parsed.data);
      form.setValue('email', parsed.data.email);
      form.setValue('code', '');
      form.setFocus('code');
      setCooldown(60);
      setMessage(t('requested'));
    } catch (error) {
      form.setError('root.server', { message: errorMessage(error, locale) });
    }
  }

  return (
    <>
      <SubmitButton disabled={resendCode.isPending} pendingText={t('working')}>
        {t('save')}
      </SubmitButton>
      <Button
        type="button"
        variant="link"
        disabled={
          form.formState.isSubmitting || resendCode.isPending || cooldown > 0
        }
        onClick={() => void resend()}
      >
        {resendCode.isPending
          ? t('working')
          : cooldown > 0
            ? t('resendAfter', { seconds: cooldown })
            : t('resend')}
      </Button>
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </>
  );
}
