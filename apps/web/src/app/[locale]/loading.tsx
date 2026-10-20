import { getTranslations } from 'next-intl/server';
import { Skeleton } from '@/shared/components/ui/skeleton';
export default async function Loading() {
  const t = await getTranslations('Forms');
  return (
    <div
      role="status"
      aria-busy="true"
      className="mx-auto grid w-[calc(100%_-_2rem)] max-w-[1180px] gap-6 py-10"
    >
      <span className="sr-only">{t('loading')}</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
