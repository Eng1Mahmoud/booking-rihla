'use client';
import { Button } from '@/shared/components/ui/button';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { UserRound, LogOut } from 'lucide-react';
import { useLogout } from '@/features/auth/hooks/useAuth';
import { errorMessage } from '@/shared/lib/apiResult';
import type { AuthUser } from '@/features/auth/types/auth';
import { AccountNavigation } from '@/features/account/components/AccountNavigation';

export function AccountProfile({ user }: { user: AuthUser }) {
  const t = useTranslations('Account');
  const locale = useLocale();
  const logout = useLogout();
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function signOut(all: boolean) {
    setBusy(true);
    setError('');
    try {
      await logout.mutateAsync(all);
    } catch (cause) {
      setError(errorMessage(cause, locale));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <AccountNavigation />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-5">
        <h1 className="text-[26px] font-semibold md:text-[29px]">
          {t('title')}
        </h1>
      </div>
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section
          className="rounded-2xl border bg-card min-w-0 p-[22px] md:p-7"
          aria-labelledby="profile-title"
        >
          <UserRound
            className="mb-3.5 text-primary"
            size={26}
            aria-hidden="true"
          />
          <h2 className="mb-5 text-[21px] font-semibold" id="profile-title">
            {t('profile')}
          </h2>
          <dl className="m-0">
            <div className="border-b py-4 last:border-0 last:pb-0">
              <dt className="mb-1.5 text-sm text-muted-foreground">
                {t('name')}
              </dt>
              <dd className="m-0 wrap-anywhere">{user.name}</dd>
            </div>
            <div className="border-b py-4 last:border-0 last:pb-0">
              <dt className="mb-1.5 text-sm text-muted-foreground">
                {t('email')}
              </dt>
              <dd className="m-0 wrap-anywhere">
                <bdi>{user.email}</bdi>
              </dd>
            </div>
            <div className="border-b py-4 last:border-0 last:pb-0">
              <dt className="mb-1.5 text-sm text-muted-foreground">
                {t('phone')}
              </dt>
              <dd className="m-0 wrap-anywhere">
                <bdi>{user.phone}</bdi>
              </dd>
            </div>
          </dl>
        </section>
        <section
          className="rounded-2xl border bg-card min-w-0 p-[22px] md:p-7"
          aria-labelledby="sessions-title"
        >
          <LogOut
            className="mb-3.5 text-primary"
            size={26}
            aria-hidden="true"
          />
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
      </div>
    </>
  );
}
