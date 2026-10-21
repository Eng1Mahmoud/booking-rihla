import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { FaqContent } from '@/features/faqs/components/FaqContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'FAQ' });
  return { title: t('metaTitle'), description: t('intro') };
}

export default function FaqPage() {
  return <FaqContent />;
}
