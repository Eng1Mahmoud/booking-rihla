'use client';
import { useState } from 'react';
import { useIsMutating } from '@tanstack/react-query';
import { authKeys } from '../hooks/queryKeys';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { VerifyEmailForm } from './VerifyEmailForm';
export function AuthForm({ returnTo }: { returnTo: string }) {
  const t = useTranslations('Auth');
  const busy = useIsMutating({ mutationKey: authKeys.all }) > 0;
  const [mode, setMode] = useState<'login' | 'register' | 'verify'>('login');
  const [challenge, setChallenge] = useState<{
    email: string;
    verificationId: string;
  } | null>(null);
  const [verified, setVerified] = useState(false);
  return (
    <div className="grid gap-5">
      <h2 className="text-2xl font-semibold">
        {t(
          mode === 'verify'
            ? 'verifyTitle'
            : mode === 'login'
              ? 'loginTitle'
              : 'registerTitle',
        )}
      </h2>
      {mode !== 'verify' && (
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
          <Button
            type="button"
            variant={mode === 'login' ? 'secondary' : 'ghost'}
            disabled={busy}
            aria-pressed={mode === 'login'}
            onClick={() => {
              setMode('login');
              setVerified(false);
            }}
          >
            {t('login')}
          </Button>
          <Button
            type="button"
            variant={mode === 'register' ? 'secondary' : 'ghost'}
            disabled={busy}
            aria-pressed={mode === 'register'}
            onClick={() => {
              setMode('register');
              setVerified(false);
            }}
          >
            {t('register')}
          </Button>
        </div>
      )}
      {verified && (
        <p role="status" className="text-sm text-primary">
          {t('verified')}
        </p>
      )}
      {mode === 'login' && <LoginForm returnTo={returnTo} />}
      {mode === 'register' && (
        <RegisterForm
          onRegistered={(value) => {
            setChallenge(value);
            setMode('verify');
          }}
        />
      )}
      {mode === 'verify' && challenge && (
        <VerifyEmailForm
          challenge={challenge}
          onVerified={() => {
            setVerified(true);
            setMode('login');
            setChallenge(null);
          }}
          onBack={() => {
            setMode('login');
            setChallenge(null);
          }}
        />
      )}
    </div>
  );
}
