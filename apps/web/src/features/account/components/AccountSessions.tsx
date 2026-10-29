'use client';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { LogOut } from 'lucide-react';
import { Button } from '@/shared/components/ui';
import { useLogout } from '@/features/auth';
import { errorMessage } from '@/shared/lib';

export function AccountSessions() {
  const t = useTranslations('Account');
  const locale = useLocale();
  const logout = useLogout();
  const [confirmAll, setConfirmAll] = useState(false);
  const busy = logout.isPending;
  const [error, setError] = useState('');
  async function signOut(all: boolean) {
    setError('');
    try {
      await logout.mutateAsync(all);
    } catch (cause) {
      setError(errorMessage(cause, locale));
    }
  }
  return (
    <section
      className="rounded-2xl border bg-card min-w-0 p-[22px] md:p-7"
      aria-labelledby="sessions-title"
    >
      <LogOut className="mb-3.5 text-primary" size={26} aria-hidden="true" />
      <h2 className="mb-5 text-[21px] font-semibold" id="sessions-title">
        {t('sessions')}
      </h2>
      <p className="text-muted-foreground leading-relaxed">
        {t('sessionHint')}
      </p>
      {error && (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] text-amber-950 leading-relaxed"
          role="alert"
        >
          {error}
        </p>
      )}
      <div
        className="mt-6 grid justify-items-start gap-[18px]"
        aria-busy={busy}
      >
        <Button
          size="lg"
          variant="outline"
          className="bg-card"
          disabled={busy}
          onClick={() => void signOut(false)}
        >
          {busy ? t('working') : t('logout')}
        </Button>
        {!confirmAll ? (
          <Button
            variant="link"
            className="h-auto min-h-11 px-0 py-2 text-primary underline underline-offset-4 whitespace-normal"
            disabled={busy}
            onClick={() => {
              setError('');
              setConfirmAll(true);
            }}
          >
            {t('logoutAll')}
          </Button>
        ) : (
          <div
            className="border-t pt-[18px]"
            role="group"
            aria-labelledby="logout-confirm"
          >
            <p className="leading-relaxed mb-4" id="logout-confirm">
              {t('confirm')}
            </p>
            <Button
              size="lg"
              variant="outline"
              className="bg-card"
              disabled={busy}
              onClick={() => void signOut(true)}
            >
              {busy ? t('working') : t('confirmAction')}
            </Button>
            <Button
              variant="link"
              className="h-auto min-h-11 px-0 py-2 text-primary underline underline-offset-4 whitespace-normal"
              disabled={busy}
              onClick={() => setConfirmAll(false)}
            >
              {t('cancel')}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
