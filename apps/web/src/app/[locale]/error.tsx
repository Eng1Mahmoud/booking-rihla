'use client';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('Forms');
  return (
    <div className="mx-auto grid w-[calc(100%_-_2rem)] max-w-lg gap-5 py-16">
      <Alert variant="destructive">
        <AlertDescription>{t('unavailable')}</AlertDescription>
      </Alert>
      <Button type="button" className="h-12" onClick={() => reset()}>
        {t('retry')}
      </Button>
    </div>
  );
}
