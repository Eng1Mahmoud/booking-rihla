import { Button } from '@/shared/components/ui/button';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
export const metadata = { robots: { index: false, follow: false } };
export default async function ForbiddenPage() {
  const t = await getTranslations('Auth');
  return (
    <div className="mx-auto w-[calc(100%-28px)] max-w-[1180px] md:w-[calc(100%-40px)] pt-6 pb-10 md:pt-9 md:pb-16">
      <section className="rounded-2xl border bg-card p-7">
        <h1 className="text-2xl font-semibold">{t('forbiddenTitle')}</h1>
        <p className="my-5">{t('forbiddenText')}</p>
        <Button size="lg" asChild>
          <Link href="/">{t('backHome')}</Link>
        </Button>
      </section>
    </div>
  );
}
