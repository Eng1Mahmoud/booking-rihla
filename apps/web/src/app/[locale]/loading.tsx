import { getTranslations } from 'next-intl/server';
import { JourneyLoading } from '@/shared/components/feedback/JourneyLoading';

export default async function Loading() {
  const t = await getTranslations('Forms');
  return <JourneyLoading title={t('loading')} description={t('loadingHint')} />;
}
