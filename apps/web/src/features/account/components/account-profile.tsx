'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { UserRound, LogOut } from 'lucide-react';
import { useSession } from '@/providers/session-provider';
import type { SessionUser } from '@/stores/session-store';
import { AuthForm } from '@/features/auth/components/auth-form';
import { errorMessage } from '@/lib/browser-api';
import { AccountNavigation } from './account-navigation';

export function AccountProfile() {
  const t = useTranslations('Account');
  const locale = useLocale();
  const { user, status, request, logout, logoutAll } = useSession();
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const query = useQuery({
    queryKey: ['owned-profile', user?.id],
    enabled: status === 'signed-in',
    retry: false,
    queryFn: () => request<{ data: SessionUser }>('auth/me'),
  });
  async function signOut(all: boolean) {
    setBusy(true);
    setError('');
    try {
      await (all ? logoutAll() : logout());
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
  if (status === 'guest')
    return (
      <div className="panel auth-required">
        <h1>{t('title')}</h1>
        <p>{t('signIn')}</p>
        <AuthForm returnTo="/account" />
      </div>
    );
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
          {query.isPending ? (
            <p role="status">{t('loading')}</p>
          ) : query.isError ? (
            <div role="alert" className="notice">
              {errorMessage(query.error, locale)}{' '}
              <button
                className="text-button"
                onClick={() => void query.refetch()}
              >
                {t('retry')}
              </button>
            </div>
          ) : (
            <dl className="account-details">
              <div>
                <dt>{t('name')}</dt>
                <dd>{query.data.data.name}</dd>
              </div>
              <div>
                <dt>{t('email')}</dt>
                <dd>
                  <bdi>{query.data.data.email}</bdi>
                </dd>
              </div>
              <div>
                <dt>{t('phone')}</dt>
                <dd>
                  <bdi>{query.data.data.phone}</bdi>
                </dd>
              </div>
            </dl>
          )}
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
