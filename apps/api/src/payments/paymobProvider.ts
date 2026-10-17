import { z } from 'zod';
import type { PaymobConfig } from '../config/paymob.ts';
import { parsePaymobEnv } from '../config/paymob.ts';
import {
  PaymentProviderError,
  type AuthorizationInput,
  type PaymentProvider,
} from './paymentProvider.ts';
const origin = 'https://accept.paymob.com';
const numericId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const amount = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const transactionId = z
  .string()
  .regex(/^[1-9]\d{0,15}$/)
  .refine((value) => Number.isSafeInteger(Number(value)));
const intentionSchema = z.object({
  id: z.string().regex(/^pi_test_[A-Za-z0-9_-]+$/),
  intention_order_id: numericId,
  client_secret: z.string().regex(/^(?:egy_)?csk_test_[A-Za-z0-9_-]+$/),
  intention_detail: z.object({ amount, currency: z.literal('EGP') }),
  special_reference: z.string(),
  payment_methods: z
    .array(
      z.object({
        integration_id: numericId,
        live: z.literal(false),
        currency: z.literal('EGP'),
      }),
    )
    .length(1),
});
const transactionSchema = z.object({
  id: numericId,
  order: z.object({ id: numericId }),
  integration_id: numericId,
  owner: numericId,
  amount_cents: amount,
  currency: z.literal('EGP'),
  pending: z.boolean(),
  success: z.boolean(),
  is_auth: z.boolean(),
  is_capture: z.boolean(),
  is_voided: z.boolean(),
  is_refunded: z.boolean(),
  is_standalone_payment: z.boolean(),
  is_live: z.literal(false),
  captured_amount: z
    .number()
    .int()
    .nonnegative()
    .max(Number.MAX_SAFE_INTEGER)
    .nullable(),
});
const inputSchema = z.object({
  reference: z.string().min(1).max(100),
  amountPiastres: amount,
  expiresAt: z.iso.datetime({ offset: true }),
  customer: z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.email(),
    phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  }),
});
// Dependencies are explicit for transport tests; no SDK or global fetch monkeypatch.
export function createPaymobProvider(
  config: PaymobConfig,
  transport: typeof fetch = fetch,
  now: () => number = Date.now,
): PaymentProvider {
  // Revalidate callers too: TypeScript alone cannot prevent live credentials at runtime.
  config = parsePaymobEnv({
    ...Object.fromEntries(
      Object.entries(config).map(([key, value]) => [key, String(value)]),
    ),
    PAYMOB_ENABLED: 'true',
  })!;
  async function request(
    path: string,
    method: 'GET' | 'POST',
    body?: object,
    bearer?: string,
  ): Promise<unknown> {
    try {
      const response = await transport(origin + path, {
        method,
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: bearer
            ? 'Bearer ' + bearer
            : 'Token ' + config.PAYMOB_SECRET_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok) {
        // A gateway error is not proof that a money-moving POST failed.
        throw new PaymentProviderError(method === 'POST');
      }
      return await response.json();
    } catch (error) {
      if (error instanceof PaymentProviderError) throw error;
      // Do not include upstream bodies, URLs, customer data or secrets in errors.
      throw new PaymentProviderError(method === 'POST');
    }
  }
  return {
    async createAuthorization(rawInput: AuthorizationInput) {
      const input = inputSchema.parse(rawInput);
      const remainingMs = Date.parse(input.expiresAt) - now();
      const remaining = Math.floor(remainingMs / 1000);
      // No usable checkout when less than a full second remains. Never extend a hold.
      if (remaining < 1 || remainingMs > 600000)
        throw new PaymentProviderError();
      const raw = await request('/v1/intention/', 'POST', {
        amount: input.amountPiastres,
        currency: 'EGP',
        payment_methods: [config.PAYMOB_INTEGRATION_ID],
        is_auth: true,
        special_reference: input.reference,
        expiration: remaining,
        billing_data: {
          first_name: input.customer.firstName,
          last_name: input.customer.lastName,
          email: input.customer.email,
          phone_number: input.customer.phone,
        },
        notification_url: config.PAYMOB_NOTIFICATION_URL,
        redirection_url: config.PAYMOB_RETURN_URL,
      });
      const parsed = intentionSchema.safeParse(raw);
      if (
        !parsed.success ||
        parsed.data.intention_detail.amount !== input.amountPiastres ||
        parsed.data.special_reference !== input.reference ||
        parsed.data.payment_methods[0]!.integration_id !==
          config.PAYMOB_INTEGRATION_ID
      )
        throw new PaymentProviderError(true);
      if (Date.parse(input.expiresAt) <= now())
        throw new PaymentProviderError(true);
      const result = parsed.data;
      const checkout = new URL('/unifiedcheckout/', origin);
      checkout.searchParams.set('publicKey', config.PAYMOB_PUBLIC_KEY);
      checkout.searchParams.set('clientSecret', result.client_secret);
      return {
        intentionId: result.id,
        orderId: String(result.intention_order_id),
        checkoutUrl: checkout.href,
      };
    },
    async capture(id, amountPiastres) {
      transactionId.parse(id);
      amount.parse(amountPiastres);
      // A successful HTTP response is NOT payment confirmation; inquire or process a verified callback.
      await request('/api/acceptance/capture', 'POST', {
        transaction_id: Number(id),
        amount_cents: amountPiastres,
      });
    },
    async voidAuthorization(id) {
      transactionId.parse(id);
      await request('/api/acceptance/void_refund/void', 'POST', {
        transaction_id: Number(id),
      });
    },
    async getTransaction(id) {
      transactionId.parse(id);
      const credentials = await request('/api/auth/tokens', 'POST', {
        api_key: config.PAYMOB_API_KEY,
      });
      const token = z
        .object({ token: z.string().min(1) })
        .safeParse(credentials);
      if (!token.success) throw new PaymentProviderError();
      const raw = await request(
        '/api/acceptance/transactions/' + id,
        'GET',
        undefined,
        token.data.token,
      );
      const parsed = transactionSchema.safeParse(raw);
      if (
        !parsed.success ||
        String(parsed.data.id) !== id ||
        parsed.data.integration_id !== config.PAYMOB_INTEGRATION_ID ||
        parsed.data.owner !== config.PAYMOB_OWNER_ID
      )
        throw new PaymentProviderError();
      const t = parsed.data;
      if ((t.captured_amount ?? 0) > t.amount_cents)
        throw new PaymentProviderError();
      return {
        id: String(t.id),
        orderId: String(t.order.id),
        integrationId: t.integration_id,
        ownerId: t.owner,
        amountPiastres: t.amount_cents,
        currency: t.currency,
        pending: t.pending,
        success: t.success,
        authorization: t.is_auth,
        capture: t.is_capture,
        voided: t.is_voided,
        refunded: t.is_refunded,
        standalone: t.is_standalone_payment,
        live: t.is_live,
        capturedPiastres: t.captured_amount ?? 0,
      };
    },
  };
}
