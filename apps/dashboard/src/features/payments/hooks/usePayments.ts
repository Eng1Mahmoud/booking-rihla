'use client';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useDataTableState } from '@/shared/hooks/useDataTableState';
import { useActionErrors } from '@/shared/hooks/useActionErrors';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { invokeAction } from '@/shared/lib/apiResult';
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
  const focus = useDialogFocus<HTMLHeadingElement>();
  const [selected, setSelected] = useState<string | null>(null);
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
