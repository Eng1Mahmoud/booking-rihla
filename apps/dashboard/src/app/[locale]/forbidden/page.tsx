import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { SignOutButton } from '@/features/auth/components/SignOutButton';
import { LanguageSwitcher } from '@/shared/components/layout/LanguageSwitcher';
export default async function ForbiddenPage() {
  const t = await getTranslations('Auth');
  return (
    <main className="mx-auto max-w-lg p-6 py-20">
      <LanguageSwitcher />
      <section className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6 xl:px-[27px] mt-6">
        <h1 className="text-2xl font-semibold">{t('forbiddenTitle')}</h1>
        <p className="my-5">{t('forbiddenText')}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href="/">{t('backWorkspace')}</Link>
          </Button>
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
