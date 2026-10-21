'use client';
import { useTranslations } from 'next-intl';
import { UserRound } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function AccountProfile() {
  const t = useTranslations('Account');
  const { user } = useAuth();
  if (!user) return null;

  return (
    <section
      className="rounded-2xl border bg-card min-w-0 p-[22px] md:p-7"
      aria-labelledby="profile-title"
    >
      <UserRound className="mb-3.5 text-primary" size={26} aria-hidden="true" />
      <h2 className="mb-5 text-[21px] font-semibold" id="profile-title">
        {t('profile')}
      </h2>
      <dl className="m-0">
        {(['name', 'email', 'phone'] as const).map((field) => (
          <div key={field} className="border-b py-4 last:border-0 last:pb-0">
            <dt className="mb-1.5 text-sm text-muted-foreground">{t(field)}</dt>
            <dd className="m-0 wrap-anywhere">
              <bdi>{user[field]}</bdi>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
