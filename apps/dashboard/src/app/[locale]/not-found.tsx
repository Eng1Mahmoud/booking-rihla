import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
export default async function NotFound() {
  const t = await getTranslations('Forms');
  return (
    <main className="mx-auto max-w-lg p-8 py-20">
      <h1 className="text-2xl font-semibold">{t('notFound')}</h1>
      <Link
        href="/dashboard"
        className="mt-5 inline-flex text-primary underline"
      >
        {t('home')}
      </Link>
    </main>
  );
}
