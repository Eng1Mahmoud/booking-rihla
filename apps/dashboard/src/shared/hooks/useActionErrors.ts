'use client';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@/i18n/navigation';
import { ApiError } from '@/shared/lib/apiResult';

export function useActionErrors(
  queryError: unknown,
  messages: Record<string, string>,
) {
  const t = useTranslations('Errors');
  const client = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    if (
      queryError instanceof ApiError &&
      (queryError.status === 401 || queryError.status === 403)
    ) {
      client.clear();
      router.refresh();
    }
  }, [queryError, client, router]);

  return (error: unknown) => {
    if (!(error instanceof ApiError)) return new Error(t('mutationFailed'));
    if (error.status === 401 || error.status === 403) {
      client.clear();
      router.refresh();
      return new ApiError(
        error.status,
        error.code,
        t(error.status === 401 ? 'sessionExpired' : 'accessDenied'),
      );
    }
    const uncertain = [
      'UPSTREAM_UNAVAILABLE',
      'UPSTREAM_ERROR',
      'NETWORK_ERROR',
    ].includes(error.code);
    return new ApiError(
      error.status,
      error.code,
      uncertain
        ? t('uncertainMutation')
        : (messages[error.code] ?? error.message),
      error.requestId,
    );
  };
}
