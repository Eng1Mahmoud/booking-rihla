import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PolicyPage } from '@/shared/components/layout/PolicyPage';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Privacy' });
  return {
    title: t('metaTitle'),
    description: t('intro'),
    robots: { index: false, follow: true },
  };
}

export default function PrivacyPage() {
  return <PolicyPage policy="Privacy" />;
}
