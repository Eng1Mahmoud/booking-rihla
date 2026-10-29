import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { FaqContent } from '@/features/faqs';
import { PageIntro } from '@/shared/components/layout';
import { Button } from '@/shared/components/ui';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'FAQ' });
  return { title: t('metaTitle'), description: t('intro') };
}

export default async function FaqPage() {
  const t = await getTranslations('FAQ');
  return (
    <>
      <PageIntro
        title={t('title')}
        description={t('intro')}
        eyebrow={t('eyebrow')}
      />
      <FaqContent />
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[1240px] pb-10">
        <div className="mt-10 flex flex-col gap-4 border-t pt-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">{t('ctaTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('ctaText')}</p>
          </div>
          <Button asChild size="lg">
            <Link href="/#trip-search-title">{t('cta')}</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
