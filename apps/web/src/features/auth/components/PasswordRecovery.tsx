'use client';
import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import {
  ApiError,
  isUncertainRequestError,
  errorMessage,
} from '@/shared/lib/apiClient';
import { authApi } from '../api/auth.api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  recoveryEmailSchema,
  recoveryResetSchema,
  type RecoveryValues,
} from '@/features/auth/schemas/recoverySchema';

export function PasswordRecovery({
  initialStep,
  returnTo,
}: {
  initialStep: 'request' | 'reset';
  returnTo: string;
}) {
  const t = useTranslations('Recovery');
  const locale = useLocale();
  const { clearSession } = useAuth();
  const [step, setStep] = useState<'request' | 'reset' | 'done'>(initialStep);
  const [message, setMessage] = useState('');
  const [error, setErrorMessage] = useState('');
  const [resendBusy, setResendBusy] = useState(false);
  const [resendAfter, setResendAfter] = useState(0);
  const [now, setNow] = useState(0);
  const prefix = useId();
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<RecoveryValues>({
    defaultValues: {
      email: '',
      code: '',
      newPassword: '',
      confirmPassword: '',
    },
  });
  const cooldown = Math.max(0, Math.ceil((resendAfter - now) / 1000));
  const coolingDown = cooldown > 0;
  const busy = isSubmitting || resendBusy;
  const loginHref = '/login?returnTo=' + encodeURIComponent(returnTo);
  useEffect(() => {
    if (!coolingDown) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [coolingDown]);
  useEffect(() => {
    if (step === 'reset') setFocus(getValues('email') ? 'code' : 'email');
  }, [step, setFocus, getValues]);

  function startCooldown() {
    const time = Date.now();
    setNow(time);
    setResendAfter(time + 60000);
  }
  function validationErrors(values: RecoveryValues) {
    const parsed = recoveryResetSchema.safeParse(values);
    if (parsed.success) return parsed.data;
    let first: keyof RecoveryValues | undefined;
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof RecoveryValues;
      if (!['email', 'code', 'newPassword', 'confirmPassword'].includes(field))
        continue;
      first ??= field;
      setError(field, {
        type: 'validate',
        message: t(
          issue.message === 'mismatch'
            ? 'mismatch'
            : field === 'email'
              ? 'invalidEmail'
              : field === 'code'
                ? 'invalidCode'
                : 'passwordHint',
        ),
      });
    }
    if (first) setFocus(first);
    return null;
  }
  async function submit(values: RecoveryValues) {
    setErrorMessage('');
    setMessage('');
    if (step === 'request') {
      const parsed = recoveryEmailSchema.safeParse(values);
      if (!parsed.success) {
        setError('email', { message: t('invalidEmail') });
        setFocus('email');
        return;
      }
      try {
        await authApi.forgotPassword(parsed.data);
        setValue('email', parsed.data.email);
        setValue('code', '');
        setMessage(t('requested'));
        startCooldown();
        setStep('reset');
      } catch (cause) {
        setErrorMessage(errorMessage(cause, locale));
      }
      return;
    }
    const parsed = validationErrors(values);
    if (!parsed) return;
    try {
      await authApi.resetPassword(parsed);
      await clearSession();
      reset();
      setStep('done');
    } catch (cause) {
      setErrorMessage(
        isUncertainRequestError(cause)
          ? t('uncertain')
          : errorMessage(cause, locale),
      );
      if (
        cause instanceof ApiError &&
        cause.code === 'INVALID_RESET_CODE'
      )
        setFocus('code');
    }
  }
  async function resend() {
    if (busy || Date.now() < resendAfter) return;
    const parsed = recoveryEmailSchema.safeParse({ email: getValues('email') });
    if (!parsed.success) {
      setError('email', { message: t('invalidEmail') });
      setFocus('email');
      return;
    }
    setResendBusy(true);
    setErrorMessage('');
    setMessage('');
    try {
      await authApi.forgotPassword(parsed.data);
      setValue('email', parsed.data.email);
      setValue('code', '');
      startCooldown();
      setMessage(t('requested'));
      setFocus('code');
    } catch (cause) {
      setErrorMessage(errorMessage(cause, locale));
    } finally {
      setResendBusy(false);
    }
  }
  function hint(field: keyof RecoveryValues) {
    return errors[field] ? (
      <small
        id={prefix + '-' + field + '-error'}
        role="alert"
        className="field-error"
      >
        {errors[field]?.message}
      </small>
    ) : null;
  }
  return (
    <section className="auth-screen">
      <div className="auth-intro">
        <KeyRound size={30} aria-hidden="true" />
        <h1>{t('introTitle')}</h1>
        <p>{t('introText')}</p>
      </div>
      <div className="panel p-7 sm:p-9 auth-form">
        {step === 'done' ? (
          <div className="recovery-success">
            <div role="status">
              <CheckCircle2 size={32} aria-hidden="true" />
              <h2>{t('successTitle')}</h2>
              <p>{t('successNote')}</p>
            </div>
            <Link href={loginHref} className="button-primary">
              {t('backLogin')}
            </Link>
          </div>
        ) : (
          <>
            <h2>{t(step === 'request' ? 'requestTitle' : 'resetTitle')}</h2>
            <p className="muted text-sm mb-5">
              {t(step === 'request' ? 'requestNote' : 'resetNote')}
            </p>
            <form
              onSubmit={handleSubmit(submit)}
              className="grid gap-4"
              noValidate
            >
              <fieldset disabled={busy} className="recovery-fields">
                <label className="field">
                  <span>{t('email')}</span>
                  <input
                    type="email"
                    autoComplete="email"
                    dir="ltr"
                    maxLength={254}
                    required
                    {...register('email')}
                    aria-invalid={!!errors.email}
                    aria-describedby={
                      errors.email ? prefix + '-email-error' : undefined
                    }
                  />
                  {hint('email')}
                </label>
                {step === 'reset' && (
                  <>
                    <label className="field">
                      <span>{t('code')}</span>
                      <input
                        dir="ltr"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        required
                        {...register('code')}
                        aria-invalid={!!errors.code}
                        aria-describedby={
                          errors.code ? prefix + '-code-error' : undefined
                        }
                      />
                      {hint('code')}
                    </label>
                    <label className="field">
                      <span>{t('newPassword')}</span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        minLength={12}
                        maxLength={128}
                        required
                        {...register('newPassword')}
                        aria-invalid={!!errors.newPassword}
                        aria-describedby={
                          prefix +
                          '-password-hint' +
                          (errors.newPassword
                            ? ' ' + prefix + '-newPassword-error'
                            : '')
                        }
                      />
                      <small id={prefix + '-password-hint'}>
                        {t('passwordHint')}
                      </small>
                      {hint('newPassword')}
                    </label>
                    <label className="field">
                      <span>{t('confirmPassword')}</span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        minLength={12}
                        maxLength={128}
                        required
                        {...register('confirmPassword')}
                        aria-invalid={!!errors.confirmPassword}
                        aria-describedby={
                          errors.confirmPassword
                            ? prefix + '-confirmPassword-error'
                            : undefined
                        }
                      />
                      {hint('confirmPassword')}
                    </label>
                  </>
                )}
              </fieldset>
              {error && (
                <p role="alert" className="notice">
                  {error}
                </p>
              )}
              {message && (
                <p role="status" className="notice">
                  {message}
                </p>
              )}
              <button
                type="submit"
                className="button-primary w-full"
                disabled={busy}
              >
                {isSubmitting
                  ? t('working')
                  : t(step === 'request' ? 'send' : 'save')}
              </button>
              {step === 'reset' && (
                <button
                  type="button"
                  className="text-button"
                  disabled={busy || coolingDown}
                  onClick={resend}
                >
                  {resendBusy
                    ? t('working')
                    : coolingDown
                      ? t('resendAfter', { seconds: cooldown })
                      : t('resend')}
                </button>
              )}
              {step === 'request' && (
                <Link
                  href={
                    '/reset-password?returnTo=' + encodeURIComponent(returnTo)
                  }
                  className="text-button"
                >
                  {t('haveCode')}
                </Link>
              )}
              <Link href={loginHref} className="text-button">
                {t('backLogin')}
              </Link>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
