import { getTranslations } from 'next-intl/server';
import { Skeleton } from '@/shared/components/ui';
export default async function Loading() {
  const t = await getTranslations('Forms');
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{t('loading')}</span>
      <Skeleton className="mb-8 h-16 w-2/3" />
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-80 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mt-4 h-64 rounded-2xl" />
    </div>
  );
}
