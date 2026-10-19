'use client';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { UserRound, LogOut } from 'lucide-react';
import { useAuth, useLogout } from '@/features/auth/hooks/useAuth';
import { errorMessage } from '@/shared/lib/apiClient';
import { AccountNavigation } from '@/features/account/components/AccountNavigation';

export function AccountProfile() {
  const t = useTranslations('Account');
  const locale = useLocale();
  const { user, status } = useAuth();
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
  if (status === 'loading')
    return (
      <p className="loading-state" role="status">
        {t('loading')}
      </p>
    );
  if (!user) return null;
  return (
    <>
      <AccountNavigation />
      <div className="section-heading">
        <h1>{t('title')}</h1>
      </div>
      <div className="account-grid">
        <section
          className="panel account-panel"
          aria-labelledby="profile-title"
        >
          <UserRound size={26} aria-hidden="true" />
          <h2 id="profile-title">{t('profile')}</h2>
          <dl className="account-details">
            <div>
              <dt>{t('name')}</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>{t('email')}</dt>
              <dd>
                <bdi>{user.email}</bdi>
              </dd>
            </div>
            <div>
              <dt>{t('phone')}</dt>
              <dd>
                <bdi>{user.phone}</bdi>
              </dd>
            </div>
          </dl>
        </section>
        <section
          className="panel account-panel"
          aria-labelledby="sessions-title"
        >
          <LogOut size={26} aria-hidden="true" />
          <h2 id="sessions-title">{t('sessions')}</h2>
          <p className="muted">{t('sessionHint')}</p>
          {error && (
            <p className="notice" role="alert">
              {error}
            </p>
          )}
          <div className="account-actions" aria-busy={busy}>
            <button
              className="button-secondary"
              disabled={busy}
              onClick={() => void signOut(false)}
            >
              {busy ? t('working') : t('logout')}
            </button>
            {!confirmAll ? (
              <button
                className="text-button"
                disabled={busy}
                onClick={() => {
                  setError('');
                  setConfirmAll(true);
                }}
              >
                {t('logoutAll')}
              </button>
            ) : (
              <div
                className="account-confirm"
                role="group"
                aria-labelledby="logout-confirm"
              >
                <p id="logout-confirm">{t('confirm')}</p>
                <button
                  className="button-secondary"
                  disabled={busy}
                  onClick={() => void signOut(true)}
                >
                  {busy ? t('working') : t('confirmAction')}
                </button>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => setConfirmAll(false)}
                >
                  {t('cancel')}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
