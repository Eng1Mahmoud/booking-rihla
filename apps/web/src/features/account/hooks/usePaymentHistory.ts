'use client';
import { useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { invokeAction } from '@/shared/lib/apiResult';
import { getPaymentHistoryAction } from '../actions/account.actions';
import type { PaymentHistoryPage } from '../types/payment';
import { accountKeys } from './queryKeys';

export function usePaymentHistory(
  initial: PaymentHistoryPage,
  userId: string,
  readAt: number,
) {
  const locale = useLocale();
  const { user } = useAuth();
  const query = useQuery({
    queryKey: accountKeys.payments(userId, locale, initial.pagination.offset),
    queryFn: () =>
      invokeAction(() => getPaymentHistoryAction(initial.pagination.offset)),
    initialData: initial,
    initialDataUpdatedAt: readAt,
    enabled: user?.id === userId,
    staleTime: 0,
  });
  return {
    ...query,
    user,
    // A fresh server snapshot takes priority over an older browser cache on navigation.
    data: query.dataUpdatedAt < readAt ? initial : query.data,
    isError: query.isError && query.errorUpdatedAt >= readAt,
  };
}
