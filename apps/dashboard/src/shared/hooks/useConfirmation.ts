'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

export function useConfirmation(onConfirm: () => void | Promise<void>) {
  const t = useTranslations('ConfirmDialog');
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
      setError(cause instanceof Error ? cause.message : t('failed'));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return { confirm, pending, error, reset };
}
