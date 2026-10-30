'use client';
import { unstable_rethrow } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { ApiError, errorMessage } from '@/shared/lib/apiResult';

export function useConfirmation(onConfirm: () => void | Promise<void>) {
  const locale = useLocale();
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const reset = useCallback(() => setError(''), []);

  async function confirm() {
    if (inFlight.current) return;
    inFlight.current = true;
    setError('');
    setPending(true);
    try {
      await onConfirm();
    } catch (cause) {
      unstable_rethrow(cause);
      setError(
        cause instanceof Error && !(cause instanceof ApiError)
          ? cause.message
          : errorMessage(cause, locale),
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return { confirm, pending, error, reset };
}
