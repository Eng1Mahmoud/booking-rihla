import { apiFetch } from '@/shared/lib/api';
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { AccountLayout } from '@/features/account/components/AccountLayout';
import { PaymentHistory } from '@/features/account/components/PaymentHistory';
import { paymentHistoryOffsetSchema } from '@/features/account/schemas/paymentHistorySchema';
import type { PaymentHistoryPage } from '@/features/account/types/payment';
import { getSignedInUser } from '@/features/auth/lib/auth.server';
import {
  ApiError,
  getApiDataOrThrow,
  errorMessage,
} from '@/shared/lib/apiResult';
import { ReadError } from '@/shared/components/feedback/ReadError';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string }>;
}) {
  const { offset: raw = '0' } = await searchParams;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) notFound();
  const offset = paymentHistoryOffsetSchema.safeParse(Number(raw));
  if (!offset.success) notFound();
  let initial, userId, readAt;
  try {
    const user = await getSignedInUser();
    if (!user) throw new ApiError(401, 'UNAUTHENTICATED');
    initial = getApiDataOrThrow(
      await apiFetch<PaymentHistoryPage>(
        'account/payments?limit=20&offset=' + offset.data,
      ),
    );
    userId = user.id;
    readAt = Date.now();
  } catch (error) {
    return (
      <AccountLayout>
        <ReadError message={errorMessage(error, await getLocale())} />
      </AccountLayout>
    );
  }
  return (
    <AccountLayout>
      <PaymentHistory
        key={userId + ':' + offset.data}
        initial={initial}
        userId={userId}
        readAt={readAt}
      />
    </AccountLayout>
  );
}
