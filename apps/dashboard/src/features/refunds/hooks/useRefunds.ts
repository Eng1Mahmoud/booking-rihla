'use client';
import { useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useDataTableState,
  useDialogFocus,
  useConfirmation,
  useActionErrors,
} from '@/shared/hooks';
import { invokeAction, ApiError } from '@/shared/lib';
import {
  getRefundsAction,
  executeRefundAction,
} from '../actions/refund.actions';
import type { Refund } from '../schemas/refundSchema';
export function useRefunds() {
  const locale = useLocale(),
    t = useTranslations('Refunds'),
    client = useQueryClient();
  const list = useDataTableState({ initialFilters: {} }),
    focus = useDialogFocus<HTMLHeadingElement>();
  const [target, setTarget] = useState<{
      refund: Refund;
      operation: 'issue' | 'reconcile';
    } | null>(null),
    [blocked, setBlocked] = useState<string[]>([]),
    [notice, setNotice] = useState('');
  const query = useQuery({
    queryKey: ['refunds', locale, list.params.limit, list.params.offset],
    queryFn: () =>
      invokeAction(() =>
        getRefundsAction({
          limit: list.params.limit,
          offset: list.params.offset,
        }),
      ),
  });
  const actionError = useActionErrors(query.error, {
    REFUND_REVIEW_REQUIRED: t('reviewRequired'),
    PAYMENT_UNAVAILABLE: t('unavailable'),
    REFUND_NOT_FOUND: t('notFound'),
  });
  const mutation = useMutation({
    retry: false,
    mutationFn: async () => {
      if (!target || blocked.includes(target.refund.id)) return;
      const selected = target;
      try {
        await invokeAction(() =>
          executeRefundAction({
            id: selected.refund.id,
            operation: selected.operation,
          }),
        );
        await Promise.all(
          ['refunds', 'payments', 'payment', 'bookings', 'booking'].map((key) =>
            client.invalidateQueries({ queryKey: [key] }),
          ),
        );
        setTarget(null);
        setNotice(t('updated'));
      } catch (error) {
        if (
          !(error instanceof ApiError) ||
          error.status === 0 ||
          error.status >= 500
        )
          setBlocked((current) => [
            ...new Set([...current, selected.refund.id]),
          ]);
        throw actionError(error);
      }
    },
  });
  const confirmation = useConfirmation(async () => {
    await mutation.mutateAsync();
  });
  async function refresh() {
    if (mutation.isPending) return;
    const result = await query.refetch();
    if (result.isSuccess) setBlocked([]);
  }
  const open = useCallback(
    (refund: Refund, operation: 'issue' | 'reconcile') => {
      focus.remember();
      confirmation.reset();
      setNotice('');
      setTarget({ refund, operation });
    },
    [focus.remember, confirmation.reset],
  );
  return {
    list,
    focus,
    query,
    target,
    blocked,
    notice,
    confirmation,
    refresh,
    open,
    close: () => {
      if (!confirmation.pending) setTarget(null);
    },
  };
}
