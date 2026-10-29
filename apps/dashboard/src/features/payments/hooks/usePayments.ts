'use client';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import {
  useDataTableState,
  useActionErrors,
  useDialogFocus,
} from '@/shared/hooks';
import { invokeAction } from '@/shared/lib';
import { getPaymentsAction } from '../actions/payment.actions';
import {
  emptyPaymentFilters,
  type PaymentFilterValues,
} from '../schemas/paymentSchema';
export function usePayments(bookingId: string) {
  const locale = useLocale();
  const list = useDataTableState<PaymentFilterValues>({
    initialFilters: { ...emptyPaymentFilters, bookingId },
  });
  const query = useQuery({
    queryKey: ['payments', locale, list.params],
    queryFn: () =>
      invokeAction(() =>
        getPaymentsAction({
          limit: list.params.limit,
          offset: list.params.offset,
          ...list.filters,
        }),
      ),
  });
  useActionErrors(query.error, {});
  const focus = useDialogFocus<HTMLHeadingElement>(),
    [selected, setSelected] = useState<string | null>(null);
  const open = useCallback(
    (id: string) => {
      focus.remember();
      setSelected(id);
    },
    [focus.remember],
  );
  return {
    list,
    query,
    focus,
    selected,
    open,
    close: () => setSelected(null),
  };
}
