'use client';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { safeReturnPath } from '@/features/auth/lib/safeReturnPath';
import { useForm } from 'react-hook-form';
import { registerSchema, type AuthFormValues } from '../schemas/authSchema';
import { authApi } from '../api/auth.api';
import { useLocale, useTranslations } from 'next-intl';
import { useLogin } from '@/features/auth/hooks/useAuth';
import { errorMessage } from '@/shared/lib/apiClient';
export function AuthForm({ returnTo }: { returnTo: string }) {
  const locale = useLocale();
  const t = useTranslations('Auth');
  const login = useLogin();
  const [mode, setMode] = useState<'login' | 'register' | 'verify'>('login');
  const [challenge, setChallenge] = useState<{
    email: string;
    verificationId: string;
  } | null>(null);
  const [message, setMessage] = useState('');
  const [resendBusy, setResendBusy] = useState(false);
  const [resendAfter, setResendAfter] = useState(0);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = useForm<AuthFormValues>();
  async function submit(values: AuthFormValues) {
    setMessage('');
    try {
      if (mode === 'verify') {
        if (!challenge) return;
        await authApi.verifyEmail({ ...challenge, code: values.code });
        setMode('login');
        setMessage(t('verified'));
        reset();
        return;
      }
      if (mode === 'login') {
        await login.mutateAsync({
          email: values.email.trim().toLowerCase(),
          password: values.password,
        });
        // A full navigation reads the new server session and private page data.
        window.location.replace('/' + locale + safeReturnPath(returnTo));
        reset();
        return;
      }
      const result = registerSchema.safeParse(values);
      if (!result.success) {
        setMessage(t('checkDetails'));
        return;
      }
      const payload = await authApi.register({
        ...result.data,
        language: locale,
      });
      setChallenge({
        email: result.data.email,
        verificationId: payload.verificationId,
      });
      setResendAfter(Date.now() + 60000);
      setMode('verify');
      reset({ code: '' });
    } catch (error) {
      setMessage(errorMessage(error, locale));
    }
  }
  async function resend() {
    if (!challenge || resendBusy) return;
    if (Date.now() < resendAfter) {
      setMessage(t('waitResend'));
      return;
    }
    setResendBusy(true);
    try {
      await authApi.resendVerification(challenge);
      setResendAfter(Date.now() + 60000);
      setMessage(t('resent'));
    } catch (error) {
      setMessage(errorMessage(error, locale));
    } finally {
      setResendBusy(false);
    }
  }
  return (
    <div className="auth-form">
      <h2>
        {mode === 'verify'
          ? t('verifyTitle')
          : mode === 'login'
            ? t('loginTitle')
            : t('registerTitle')}
      </h2>
      {mode !== 'verify' && (
        <div className="auth-tabs">
          <button
            type="button"
            aria-pressed={mode === 'login'}
            onClick={() => {
              setMode('login');
              setMessage('');
              reset();
            }}
          >
            {t('login')}
          </button>
          <button
            type="button"
            aria-pressed={mode === 'register'}
            onClick={() => {
              setMode('register');
              setMessage('');
              reset();
            }}
          >
            {t('register')}
          </button>
        </div>
      )}
      {mode === 'verify' && (
        <p className="muted text-sm mb-5">
          {t('codeSent')} <bdi>{challenge?.email}</bdi>
        </p>
      )}
      <form onSubmit={handleSubmit(submit)} className="grid gap-4">
        {mode === 'register' && (
          <label className="field">
            <span>{t('name')}</span>
            <input
              autoComplete="name"
              maxLength={100}
              required
              {...register('name')}
            />
          </label>
        )}
        {mode !== 'verify' && (
          <label className="field">
            <span>{t('email')}</span>
            <input
              type="email"
              autoComplete="email"
              dir="ltr"
              required
              {...register('email')}
            />
          </label>
        )}
        {mode === 'register' && (
          <label className="field">
            <span>{t('phone')}</span>
            <input
              type="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder="+201xxxxxxxxx"
              pattern="\+[1-9][0-9]{7,14}"
              required
              {...register('phone')}
            />
            <small>{t('internationalPhone')}</small>
          </label>
        )}
        {mode !== 'verify' && (
          <label className="field">
            <span>{t('password')}</span>
            <input
              type="password"
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              minLength={12}
              maxLength={128}
              required
              {...register('password')}
            />
            {mode === 'register' && <small>{t('passwordHint')}</small>}
          </label>
        )}
        {mode === 'verify' && (
          <label className="field">
            <span>{t('code')}</span>
            <input
              dir="ltr"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              {...register('code')}
            />
          </label>
        )}
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        <button className="button-primary w-full" disabled={isSubmitting}>
          {isSubmitting
            ? t('working')
            : mode === 'verify'
              ? t('verify')
              : mode === 'login'
                ? t('login')
                : t('register')}
        </button>
        {mode === 'login' && (
          <Link
            href={
              '/forgot-password?returnTo=' +
              encodeURIComponent(safeReturnPath(returnTo))
            }
            className="text-button"
          >
            {t('forgotPassword')}
          </Link>
        )}
        {mode === 'verify' && (
          <>
            <button
              className="text-button"
              type="button"
              onClick={resend}
              disabled={resendBusy}
            >
              {t('resend')}
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setMode('login');
                setMessage('');
                reset();
              }}
            >
              {t('backLogin')}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
