import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
export const metadata = { robots: { index: false, follow: false } };
export default async function ForbiddenPage() {
  const t = await getTranslations('Auth');
  return (
    <div className="container-shell page-space">
      <section className="panel p-7">
        <h1 className="text-2xl font-semibold">{t('forbiddenTitle')}</h1>
        <p className="my-5">{t('forbiddenText')}</p>
        <Link href="/" className="button-primary">
          {t('backHome')}
        </Link>
      </section>
    </div>
  );
}
