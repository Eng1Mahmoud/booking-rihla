'use client';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { z } from 'zod';
import { Link } from '@/i18n/navigation';
import { Form } from '@/shared/components/forms/Form';
import { FormInput } from '@/shared/components/forms/FormInput';
import { SubmitButton } from '@/shared/components/forms/SubmitButton';
import { Button } from '@/shared/components/ui/button';
import {
  ApiError,
  isUncertainRequestError,
  errorMessage,
} from '@/shared/lib/apiResult';
import { useAuth, useForgotPassword, useResetPassword } from '../hooks/useAuth';
import {
  recoveryEmailSchema,
  recoveryResetSchema,
  type RecoveryValues,
} from '../schemas/recoverySchema';
export function PasswordRecovery({
  initialStep,
  returnTo,
}: {
  initialStep: 'request' | 'reset';
  returnTo: string;
}) {
  const t = useTranslations('Recovery'),
    locale = useLocale(),
    { clearSession } = useAuth();
  const forgot = useForgotPassword(),
    resetPassword = useResetPassword();
  const [step, setStep] = useState<'request' | 'reset' | 'done'>(initialStep);
  const [email, setEmail] = useState(''),
    [message, setMessage] = useState(''),
    [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const loginHref = '/login?returnTo=' + encodeURIComponent(returnTo);
  // Keep client validation messages localized; the Action revalidates the domain schema.
  const resetSchema = z
    .object({ ...recoveryResetSchema.shape })
    .refine((values) => values.newPassword === values.confirmPassword, {
      path: ['confirmPassword'],
      message: t('mismatch'),
    });
  return (
    <section className="mx-auto grid w-[calc(100%_-_2rem)] max-w-[980px] gap-8 py-10 md:grid-cols-2 md:items-center md:gap-14 md:py-16">
      <div className="space-y-4">
        <KeyRound size={30} aria-hidden="true" />
        <h1 className="text-3xl font-semibold leading-relaxed md:text-4xl">
          {t('introTitle')}
        </h1>
        <p className="text-muted-foreground">{t('introText')}</p>
      </div>
      <div className="rounded-2xl border bg-card p-6 sm:p-9">
        {step === 'done' ? (
          <div className="grid gap-5">
            <div role="status" className="space-y-4">
              <CheckCircle2 size={32} className="text-primary" />
              <h2 className="text-2xl font-semibold">{t('successTitle')}</h2>
              <p className="text-muted-foreground">{t('successNote')}</p>
            </div>
            <Button asChild className="h-12">
              <Link href={loginHref}>{t('backLogin')}</Link>
            </Button>
          </div>
        ) : (
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
                defaultValues={{ email }}
                onSubmit={async (values) => {
                  await forgot.mutateAsync(values);
                  setEmail(values.email);
                  setMessage(t('requested'));
                  setCooldown(60);
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
                <SubmitButton pendingText={t('working')}>
                  {t('send')}
                </SubmitButton>
                <Link
                  href={
                    '/reset-password?returnTo=' + encodeURIComponent(returnTo)
                  }
                  className="text-center text-sm font-semibold text-primary hover:underline"
                >
                  {t('haveCode')}
                </Link>
              </Form>
            ) : (
              <Form
                schema={resetSchema}
                defaultValues={{
                  email,
                  code: '',
                  newPassword: '',
                  confirmPassword: '',
                }}
                onSubmit={async (values) => {
                  try {
                    await resetPassword.mutateAsync(values);
                    await clearSession();
                    setMessage('');
                    setStep('done');
                  } catch (error) {
                    if (isUncertainRequestError(error))
                      throw new ApiError(
                        502,
                        'UPSTREAM_UNAVAILABLE',
                        t('uncertain'),
                      );
                    throw error;
                  }
                }}
              >
                {(form) => (
                  <>
                    <FormInput<RecoveryValues>
                      name="email"
                      label={t('email')}
                      type="email"
                      dir="ltr"
                      autoComplete="email"
                      maxLength={254}
                    />
                    <FormInput<RecoveryValues>
                      name="code"
                      label={t('code')}
                      dir="ltr"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                    />
                    <FormInput<RecoveryValues>
                      name="newPassword"
                      label={t('newPassword')}
                      type="password"
                      autoComplete="new-password"
                      maxLength={128}
                      description={t('passwordHint')}
                    />
                    <FormInput<RecoveryValues>
                      name="confirmPassword"
                      label={t('confirmPassword')}
                      type="password"
                      autoComplete="new-password"
                      maxLength={128}
                    />
                    <SubmitButton
                      disabled={forgot.isPending}
                      pendingText={t('working')}
                    >
                      {t('save')}
                    </SubmitButton>
                    <Button
                      type="button"
                      variant="link"
                      disabled={
                        form.formState.isSubmitting ||
                        forgot.isPending ||
                        cooldown > 0
                      }
                      onClick={async () => {
                        const parsed = recoveryEmailSchema.safeParse({
                          email: form.getValues('email'),
                        });
                        if (!parsed.success) {
                          form.setError('email', {
                            message: t('invalidEmail'),
                          });
                          form.setFocus('email');
                          return;
                        }
                        form.clearErrors('root');
                        setMessage('');
                        try {
                          await forgot.mutateAsync(parsed.data);
                          form.setValue('email', parsed.data.email);
                          form.setValue('code', '');
                          form.setFocus('code');
                          setCooldown(60);
                          setMessage(t('requested'));
                        } catch (error) {
                          form.setError('root.server', {
                            message: errorMessage(error, locale),
                          });
                        }
                      }}
                    >
                      {forgot.isPending
                        ? t('working')
                        : cooldown > 0
                          ? t('resendAfter', { seconds: cooldown })
                          : t('resend')}
                    </Button>
                  </>
                )}
              </Form>
            )}
            {message && (
              <p role="status" className="mt-4 text-sm text-muted-foreground">
                {message}
              </p>
            )}
            <Link
              href={loginHref}
              className="mt-5 block text-center text-sm font-semibold text-primary hover:underline"
            >
              {t('backLogin')}
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
