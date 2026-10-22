import { NextResponse, type NextRequest } from 'next/server';
import { parseSchema } from '@/shared/lib/parseSchema';
import { paymentStatusInputSchema } from '@/features/bookings/schemas/bookingSchema';
import { apiFetch } from '@/shared/lib/api';
import { authenticatedFetch } from '@/features/auth/lib/auth.server';
import type { BookingPayment } from '@/features/bookings/types/booking';

export const runtime = 'nodejs';

// The only browser read endpoint: owner-scoped payment status, never provider reconciliation.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  const locale = request.headers.get('accept-language') ?? 'en';
  const headers = {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Cookie, Accept-Language',
  };
  const origin = request.headers.get('origin');
  if (
    (origin &&
      origin !== (process.env.SITE_ORIGIN ?? request.nextUrl.origin)) ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  ) {
    return NextResponse.json(
      {
        success: false,
        code: 'CSRF_REJECTED',
        message: locale.startsWith('ar')
          ? 'تعذر إكمال الطلب.'
          : 'Could not complete the request.',
      },
      { status: 403, headers },
    );
  }
  const { bookingId } = await context.params;
  const parsed = await parseSchema(
    paymentStatusInputSchema,
    { bookingId, search: request.nextUrl.search },
    locale,
  );
  if (!parsed.success) {
    const { status, ...body } = parsed.error;
    return NextResponse.json(body, { status, headers });
  }
  const result = await authenticatedFetch<BookingPayment>(
    'bookings/' + parsed.data.bookingId + '/payment',
    {
      locale,
      requestHeaders: request.headers,
      signal: request.signal,
    },
  );
  const { status, retryAfter, ...body } = result;
  let data;
  if (result.success && result.data) {
    const availability = await apiFetch<{ checkoutEnabled: boolean }>(
      'payments/availability',
      { locale, signal: request.signal, requestHeaders: request.headers },
    );
    data = {
      payment: { ...result.data, checkoutUrl: undefined },
      checkoutEnabled:
        availability.success && availability.data?.checkoutEnabled === true,
    };
  }
  const response = NextResponse.json({ ...body, data }, { status, headers });
  if (retryAfter) response.headers.set('Retry-After', retryAfter);
  return response;
}
