import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
export default async function NotFound() {
  const t = await getTranslations('Forms');
  return (
    <section className="mx-auto grid w-[calc(100%_-_2rem)] max-w-lg gap-5 py-16 text-center">
      <h1 className="text-2xl font-semibold">{t('notFound')}</h1>
      <Button asChild className="h-12">
        <Link href="/">{t('home')}</Link>
      </Button>
    </section>
  );
}
