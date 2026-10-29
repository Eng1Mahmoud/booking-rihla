import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { KeyRound } from 'lucide-react';
import { AccountLayout } from '@/features/account/components/AccountLayout';
import { AccountSessions } from '@/features/account/components/AccountSessions';
import { Button } from '@/shared/components/ui/button';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SecurityPage() {
  const t = await getTranslations('Account');
  return (
    <AccountLayout>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold md:text-3xl">{t('security')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('securityHint')}
        </p>
      </div>
      <div className="grid gap-6">
        <AccountSessions />
        <section className="rounded-2xl border bg-card p-6 md:p-7">
          <KeyRound
            size={25}
            aria-hidden="true"
            className="mb-4 text-primary"
          />
          <h2 className="text-xl font-semibold">{t('password')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t('passwordHint')}
          </p>
          <Button asChild variant="outline" className="mt-5 min-h-11">
            <Link href="/forgot-password?returnTo=%2Faccount%2Fsecurity">
              {t('recoverPassword')}
            </Link>
          </Button>
        </section>
      </div>
    </AccountLayout>
  );
}
