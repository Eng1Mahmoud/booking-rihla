'use client';
import { useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui';
import { errorMessage, invokeAction } from '@/shared/lib';
import { logoutAction } from '../actions/auth.actions';
export function SignOutButton() {
  const t = useTranslations('Auth');
  const locale = useLocale();
  const router = useRouter();
  const client = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label={t('logout')}
        disabled={pending}
        aria-busy={pending}
        onClick={() =>
          startTransition(async () => {
            setError('');
            try {
              await invokeAction(logoutAction);
              client.clear();
              router.replace('/login');
              router.refresh();
            } catch (cause) {
              setError(errorMessage(cause, locale));
            }
          })
        }
      >
        <LogOut aria-hidden="true" />
      </Button>
      {error && (
        <p
          role="alert"
          className="absolute end-0 top-12 z-50 w-64 rounded-lg border bg-card p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
