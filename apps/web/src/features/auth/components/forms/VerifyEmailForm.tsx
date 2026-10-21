'use client';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { z } from 'zod';
import { Form } from '@/shared/components/forms/Form';
import { FormInput } from '@/shared/components/forms/FormInput';
import { SubmitButton } from '@/shared/components/forms/SubmitButton';
import { Button } from '@/shared/components/ui/button';
import { verifyEmailSchema } from '../../schemas/authSchema';
import { useVerifyEmail, useResendVerification } from '../../hooks/useAuth';
import { errorMessage } from '@/shared/lib/apiResult';
const codeSchema = verifyEmailSchema.pick({ code: true });
export function VerifyEmailForm({
  challenge,
  onVerified,
  onBack,
}: {
  challenge: { email: string; verificationId: string };
  onVerified: () => void;
  onBack: () => void;
}) {
  const t = useTranslations('Auth'),
    locale = useLocale(),
    verify = useVerifyEmail(),
    resend = useResendVerification();
  const [cooldown, setCooldown] = useState(60),
    [message, setMessage] = useState('');
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  return (
    <Form
      schema={codeSchema}
      defaultValues={{ code: '' }}
      onSubmit={async (values) => {
        await verify.mutateAsync({ ...challenge, ...values });
        onVerified();
      }}
    >
      <p className="text-sm text-muted-foreground">
        {t('codeSent')} <bdi>{challenge.email}</bdi>
      </p>
      <FormInput<z.input<typeof codeSchema>>
        name="code"
        label={t('code')}
        dir="ltr"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
      />
      <SubmitButton pendingText={t('working')}>{t('verify')}</SubmitButton>
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
      <Button
        type="button"
        variant="link"
        disabled={resend.isPending || verify.isPending || cooldown > 0}
        onClick={async () => {
          try {
            await resend.mutateAsync(challenge);
            setCooldown(60);
            setMessage(t('resent'));
          } catch (error) {
            setMessage(errorMessage(error, locale));
          }
        }}
      >
        {t('resend')}
        {cooldown > 0 ? ' (' + cooldown + ')' : ''}
      </Button>
      <Button
        type="button"
        variant="link"
        disabled={resend.isPending || verify.isPending}
        onClick={onBack}
      >
        {t('backLogin')}
      </Button>
    </Form>
  );
}
