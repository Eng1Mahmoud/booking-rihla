import { getTranslations } from 'next-intl/server';
import { BusFront } from 'lucide-react';
import { LoginForm } from '@/features/auth';
import { LanguageSwitcher } from '@/shared/components/layout';
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const t = await getTranslations('Auth');
  const params = await searchParams;
  const returnTo =
    typeof params.returnTo === 'string' ? params.returnTo : '/dashboard';
  return (
    <main className="mx-auto flex min-h-dvh w-[calc(100%-2rem)] max-w-md flex-col justify-center py-10">
      <div className="mb-7 flex items-center justify-between">
        <span
          className="inline-flex items-center gap-2 text-2xl font-semibold"
          dir="ltr"
        >
          <BusFront className="text-primary" aria-hidden="true" />
          Rihla.
        </span>
        <LanguageSwitcher />
      </div>
      <section className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6 xl:px-[27px]">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-2 mb-7 text-sm text-muted-foreground">{t('intro')}</p>
        <LoginForm returnTo={returnTo} />
      </section>
    </main>
  );
}
