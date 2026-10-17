import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { inspectPaymobSetup, parsePaymobEnv } from '../src/config/paymob.ts';
import { createPaymobProvider } from '../src/payments/paymobProvider.ts';
import { PaymentProviderError } from '../src/payments/paymentProvider.ts';
import { verifyPaymobCallback } from '../src/payments/paymobHmac.ts';
const environment = {
  PAYMOB_ENABLED: 'true',
  PAYMENT_CHECKOUT_SECRET: 'ab'.repeat(32),
  PAYMOB_SECRET_KEY: 'sk_test_private_fixture',
  PAYMOB_PUBLIC_KEY: 'pk_test_fixture',
  PAYMOB_API_KEY: 'private_api_fixture',
  PAYMOB_HMAC_SECRET: 'private_hmac_fixture',
  PAYMOB_INTEGRATION_ID: '6741',
  PAYMOB_OWNER_ID: '4705',
  PAYMOB_AUTH_CAPTURE_ENABLED: 'true',
  PAYMOB_NOTIFICATION_URL:
    'https://api.example.test/api/v1/payments/paymob/webhook',
  PAYMOB_RETURN_URL: 'https://app.example.test/checkout/result',
};
const config = parsePaymobEnv(environment)!;
const time = Date.parse('2026-10-17T10:00:00Z');
const input = {
  reference: 'booking-payment-1',
  amountPiastres: 30000,
  expiresAt: new Date(time + 300000).toISOString(),
  customer: {
    firstName: 'Mahmoud',
    lastName: 'Test',
    email: 'person@example.test',
    phone: '+201012345678',
  },
};
const intention = {
  id: 'pi_test_one',
  intention_order_id: 4778239,
  client_secret: 'egy_csk_test_fixture',
  intention_detail: { amount: 30000, currency: 'EGP' },
  special_reference: input.reference,
  payment_methods: [{ integration_id: 6741, live: false, currency: 'EGP' }],
};
const transaction = {
  id: 2556706,
  order: { id: 4778239 },
  integration_id: 6741,
  owner: 4705,
  amount_cents: 30000,
  currency: 'EGP',
  pending: false,
  success: true,
  is_auth: true,
  is_capture: false,
  is_voided: false,
  is_refunded: false,
  is_standalone_payment: false,
  is_live: false,
  captured_amount: null,
};
function response(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status });
}

test('Paymob is optional and enabled settings reject live keys, missing Auth/Cap, invalid ids and unsafe URLs without leaking secrets', () => {
  assert.equal(parsePaymobEnv({}), null);
  assert.equal(parsePaymobEnv({ PAYMOB_ENABLED: 'false' }), null);
  assert.equal(config.PAYMOB_INTEGRATION_ID, 6741);
  assert.throws(
    () => parsePaymobEnv({ PAYMOB_ENABLED: 'yes' }),
    /PAYMOB_ENABLED/,
  );
  for (const overrides of [
    { PAYMOB_SECRET_KEY: 'sk_live_private_value' },
    { PAYMOB_PUBLIC_KEY: 'pk_live_private_value' },
    { PAYMOB_AUTH_CAPTURE_ENABLED: 'false' },
    { PAYMOB_API_KEY: '' },
    { PAYMOB_HMAC_SECRET: '' },
    { PAYMOB_INTEGRATION_ID: '1e3' },
    { PAYMOB_OWNER_ID: '9007199254740992' },
    { PAYMOB_NOTIFICATION_URL: 'http://private.example.test/hook' },
    { PAYMOB_RETURN_URL: 'https://user:private@example.test/result' },
    { PAYMOB_RETURN_URL: 'https://example.test/result?token=private' },
  ])
    assert.throws(
      () => parsePaymobEnv({ ...environment, ...overrides }),
      (error: unknown) =>
        error instanceof Error &&
        error.message.startsWith('Invalid payment configuration:') &&
        !error.message.includes('private'),
    );
  assert.throws(
    () =>
      createPaymobProvider({
        ...config,
        PAYMOB_SECRET_KEY: 'sk_live_private_value',
      }),
    /PAYMOB_SECRET_KEY/,
  );
});

test('authorization uses the fixed Egypt host, TEST integration, exact piastres and only remaining hold time', async () => {
  let calls = 0;
  const provider = createPaymobProvider(
    config,
    async (url, options) => {
      calls++;
      assert.equal(url, 'https://accept.paymob.com/v1/intention/');
      assert.equal(options?.redirect, 'error');
      assert.ok(options?.signal instanceof AbortSignal);
      assert.equal(
        (options?.headers as Record<string, string>).Authorization,
        'Token ' + config.PAYMOB_SECRET_KEY,
      );
      assert.deepEqual(JSON.parse(String(options?.body)), {
        amount: 30000,
        currency: 'EGP',
        payment_methods: [6741],
        is_auth: true,
        special_reference: input.reference,
        expiration: 299,
        billing_data: {
          first_name: 'Mahmoud',
          last_name: 'Test',
          email: 'person@example.test',
          phone_number: '+201012345678',
        },
        notification_url: config.PAYMOB_NOTIFICATION_URL,
        redirection_url: config.PAYMOB_RETURN_URL,
      });
      return response(intention);
    },
    () => time + 10,
  );
  const result = await provider.createAuthorization(input);
  assert.equal(calls, 1);
  assert.equal(result.orderId, '4778239');
  const link = new URL(result.checkoutUrl);
  assert.equal(link.origin, 'https://accept.paymob.com');
  assert.equal(link.searchParams.get('clientSecret'), intention.client_secret);
  assert.equal(link.searchParams.get('publicKey'), config.PAYMOB_PUBLIC_KEY);
  assert.ok(!result.checkoutUrl.includes(config.PAYMOB_SECRET_KEY));
});

test('expired, subsecond and overlong authorizations never reach Paymob', async () => {
  let calls = 0;
  const provider = createPaymobProvider(
    config,
    async () => {
      calls++;
      return response(intention);
    },
    () => time,
  );
  for (const offset of [-1000, 0, 999, 600001, 601000])
    await assert.rejects(
      provider.createAuthorization({
        ...input,
        expiresAt: new Date(time + offset).toISOString(),
      }),
      PaymentProviderError,
    );
  for (const amountPiastres of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
    await assert.rejects(
      provider.createAuthorization({ ...input, amountPiastres }),
    );
  assert.equal(calls, 0);
});

test('mismatched amounts, currency, references, live methods or malformed intentions remain uncertain and do not return checkout links', async () => {
  for (const value of [
    {},
    { ...intention, intention_detail: { amount: 1, currency: 'EGP' } },
    { ...intention, intention_detail: { amount: 30000, currency: 'USD' } },
    { ...intention, special_reference: 'different-booking' },
    {
      ...intention,
      payment_methods: [{ integration_id: 6741, live: true, currency: 'EGP' }],
    },
    {
      ...intention,
      payment_methods: [{ integration_id: 1, live: false, currency: 'EGP' }],
    },
    { ...intention, client_secret: 'csk_live_private' },
  ]) {
    const provider = createPaymobProvider(
      config,
      async () => response(value),
      () => time,
    );
    await assert.rejects(
      provider.createAuthorization(input),
      (error: unknown) =>
        error instanceof PaymentProviderError && error.uncertain,
    );
  }
});

test('transport failures and invalid responses never retry a POST or expose provider secrets', async () => {
  for (const scenario of ['timeout', 'network', 'json', 'server', 'client']) {
    let calls = 0;
    const provider = createPaymobProvider(
      config,
      async () => {
        calls++;
        if (scenario === 'timeout')
          throw new DOMException('private token', 'TimeoutError');
        if (scenario === 'network') throw new Error('private token');
        if (scenario === 'json')
          return new Response('private invalid response');
        return response(
          { error: 'private token' },
          scenario === 'server' ? 503 : 401,
        );
      },
      () => time,
    );
    await assert.rejects(
      provider.createAuthorization(input),
      (error: unknown) =>
        error instanceof PaymentProviderError &&
        !error.message.includes('private') &&
        error.uncertain === true,
    );
    assert.equal(calls, 1);
  }
});

test('capture and void submit exact operations; HTTP acceptance alone does not return a paid status', async () => {
  const requests: { url: unknown; body: unknown }[] = [];
  const provider = createPaymobProvider(config, async (url, options) => {
    requests.push({ url, body: JSON.parse(String(options?.body)) });
    return response({ success: true });
  });
  assert.equal(await provider.capture('2556706', 30000), undefined);
  assert.equal(await provider.voidAuthorization('2556706'), undefined);
  assert.deepEqual(requests, [
    {
      url: 'https://accept.paymob.com/api/acceptance/capture',
      body: { transaction_id: 2556706, amount_cents: 30000 },
    },
    {
      url: 'https://accept.paymob.com/api/acceptance/void_refund/void',
      body: { transaction_id: 2556706 },
    },
  ]);
  await assert.rejects(provider.capture('../other', 30000));
  await assert.rejects(provider.capture('2556706', 3.5));
  assert.equal(requests.length, 2);
});

test('inquiry uses the API-key auth token and rejects foreign merchants/integrations, live data and wrong transaction ids', async () => {
  for (const overrides of [
    {},
    { id: 999 },
    { owner: 999 },
    { integration_id: 999 },
    { is_live: true },
    { currency: 'USD' },
    { captured_amount: 30001 },
  ]) {
    let calls = 0;
    const provider = createPaymobProvider(config, async (url, options) => {
      calls++;
      if (calls === 1) {
        assert.equal(url, 'https://accept.paymob.com/api/auth/tokens');
        assert.deepEqual(JSON.parse(String(options?.body)), {
          api_key: config.PAYMOB_API_KEY,
        });
        return response({ token: 'private-bearer' });
      }
      assert.equal(
        url,
        'https://accept.paymob.com/api/acceptance/transactions/2556706',
      );
      assert.equal(options?.method, 'GET');
      assert.equal(
        (options?.headers as Record<string, string>).Authorization,
        'Bearer private-bearer',
      );
      return response({
        ...transaction,
        ...overrides,
        privateData: 'never-return',
      });
    });
    if (Object.keys(overrides).length)
      await assert.rejects(
        provider.getTransaction('2556706'),
        PaymentProviderError,
      );
    else {
      const result = await provider.getTransaction('2556706');
      assert.equal(result.authorization, true);
      assert.equal(result.capturedPiastres, 0);
      assert.equal(result.orderId, '4778239');
      assert.ok(!JSON.stringify(result).includes('never-return'));
    }
    assert.equal(calls, 2);
  }
});

// Independent documented vector, not a signature generated by the production helper.
const event = {
  type: 'TRANSACTION',
  obj: {
    amount_cents: 100,
    created_at: '2020-03-25T18:39:44.719228',
    currency: 'EGP',
    error_occured: false,
    has_parent_transaction: false,
    id: 2556706,
    integration_id: 6741,
    is_3d_secure: true,
    is_auth: false,
    is_capture: false,
    is_refunded: false,
    is_standalone_payment: true,
    is_voided: false,
    order: { id: 4778239 },
    owner: 4705,
    pending: false,
    source_data: { pan: '2346', sub_type: 'MasterCard', type: 'card' },
    success: true,
  },
};
const canonical =
  '1002020-03-25T18:39:44.719228EGPfalsefalse25567066741truefalsefalsefalsetruefalse47782394705false2346MasterCardcardtrue';
const signature = createHmac('sha512', config.PAYMOB_HMAC_SECRET)
  .update(canonical)
  .digest('hex');
test('callback HMAC follows the documented independent vector and returns only signed safe fields', () => {
  const result = verifyPaymobCallback(
    event,
    signature,
    config.PAYMOB_HMAC_SECRET,
  );
  assert.ok(result);
  assert.equal(result.transactionId, '2556706');
  assert.equal(result.orderId, '4778239');
  assert.equal(
    verifyPaymobCallback(
      event,
      signature.toUpperCase(),
      config.PAYMOB_HMAC_SECRET,
    )?.eventKey,
    result.eventKey,
  );
  assert.ok(!JSON.stringify(result).includes('2346'));
  assert.equal(
    verifyPaymobCallback(
      {
        ...event,
        obj: { ...event.obj, is_live: false, parent_transaction: 999 },
      },
      signature,
      config.PAYMOB_HMAC_SECRET,
    )?.eventKey,
    result.eventKey,
  );
  assert.ok(!('live' in result));
});
test('forged, malformed, missing or modified callback signatures fail closed', () => {
  for (const hmac of [
    undefined,
    null,
    '',
    'a',
    'a'.repeat(127),
    'z'.repeat(128),
    [],
    '0'.repeat(128),
  ])
    assert.equal(
      verifyPaymobCallback(event, hmac, config.PAYMOB_HMAC_SECRET),
      null,
    );
  assert.equal(verifyPaymobCallback(event, signature, 'wrong-secret'), null);
  assert.equal(verifyPaymobCallback(event, signature, ''), null);
  for (const overrides of [
    { amount_cents: 101 },
    { success: false },
    { pending: true },
    { is_auth: true },
    { owner: 1 },
    { order: { id: 1 } },
    { amount_cents: '100' },
    { source_data: null },
  ])
    assert.equal(
      verifyPaymobCallback(
        { ...event, obj: { ...event.obj, ...overrides } },
        signature,
        config.PAYMOB_HMAC_SECRET,
      ),
      null,
    );
  assert.equal(
    verifyPaymobCallback(
      { ...event, type: 'TOKEN' },
      signature,
      config.PAYMOB_HMAC_SECRET,
    ),
    null,
  );
});

test('configuration check runs without a database or network, never prints credentials and fails safely', () => {
  for (const [overrides, status, expected] of [
    [{ PAYMOB_ENABLED: 'false' }, 0, /disabled/],
    [environment, 0, /no payment request was sent/],
    [
      { ...environment, PAYMENT_CHECKOUT_SECRET: '' },
      1,
      /PAYMENT_CHECKOUT_SECRET/,
    ],
    [
      { ...environment, PAYMOB_SECRET_KEY: 'sk_live_private' },
      1,
      /PAYMOB_SECRET_KEY/,
    ],
  ] as const) {
    const result = spawnSync(
      process.execPath,
      ['src/scripts/checkPayments.ts'],
      {
        cwd: new URL('..', import.meta.url),
        env: { ...process.env, ...overrides },
        encoding: 'utf8',
        timeout: 10000,
      },
    );
    assert.ifError(result.error);
    assert.equal(result.status, status);
    const output = result.stdout + result.stderr;
    assert.match(output, expected);
    assert.ok(!output.includes('private'));
  }
});

test('a slow create response cannot expose a checkout link after the booking deadline', async () => {
  let clock = time;
  const provider = createPaymobProvider(
    config,
    async () => {
      clock = time + 300000;
      return response(intention);
    },
    () => clock,
  );
  await assert.rejects(
    provider.createAuthorization(input),
    (error: unknown) =>
      error instanceof PaymentProviderError && error.uncertain,
  );
});

test('provider snapshots configuration so later mutation cannot replace test credentials', async () => {
  const settings = { ...config };
  const provider = createPaymobProvider(settings, async (_url, options) => {
    assert.equal(
      (options?.headers as Record<string, string>).Authorization,
      'Token sk_test_private_fixture',
    );
    return response({ success: true });
  });
  settings.PAYMOB_SECRET_KEY = 'sk_live_private';
  await provider.voidAuthorization('2556706');
});

test('setup can validate credentials before the first transaction without weakening provider ownership checks', () => {
  const bootstrap = {
    ...environment,
    PAYMOB_ENABLED: 'false',
    PAYMOB_OWNER_ID: '',
    PAYMOB_AUTH_CAPTURE_ENABLED: 'false',
    PAYMOB_NOTIFICATION_URL: '',
    PAYMOB_RETURN_URL: '',
  };
  const report = inspectPaymobSetup(bootstrap);
  assert.deepEqual(report.credentialIssues, []);
  assert.deepEqual(report.remainingSettings, [
    'PAYMOB_OWNER_ID',
    'PAYMOB_AUTH_CAPTURE_ENABLED',
    'PAYMOB_NOTIFICATION_URL',
    'PAYMOB_RETURN_URL',
  ]);
  assert.throws(
    () => parsePaymobEnv({ ...bootstrap, PAYMOB_ENABLED: 'true' }),
    /PAYMOB_OWNER_ID/,
  );
  assert.deepEqual(inspectPaymobSetup(environment).remainingSettings, []);
  for (const [overrides, status] of [
    [bootstrap, 0],
    [{ ...bootstrap, PAYMOB_SECRET_KEY: 'sk_live_private' }, 1],
  ] as const) {
    const result = spawnSync(
      process.execPath,
      ['src/scripts/setupPayments.ts'],
      {
        cwd: new URL('..', import.meta.url),
        env: { ...process.env, ...overrides },
        encoding: 'utf8',
        timeout: 10000,
      },
    );
    assert.ifError(result.error);
    assert.equal(result.status, status);
    const output = result.stdout + result.stderr;
    assert.match(output, /No payment request was sent/);
    assert.match(output, /PAYMOB_OWNER_ID/);
    for (const secret of [
      environment.PAYMOB_API_KEY,
      environment.PAYMOB_HMAC_SECRET,
      'sk_live_private',
    ])
      assert.ok(!output.includes(secret));
  }
});

test('reference inquiry uses authenticated fixed-host lookup and returns no checkout or customer fields', async () => {
  const reference = '00000000-0000-4000-8000-000000000001';
  let calls = 0;
  const provider = createPaymobProvider(config, async (url, options) => {
    calls++;
    if (calls === 1) {
      assert.equal(url, 'https://accept.paymob.com/api/auth/tokens');
      assert.deepEqual(JSON.parse(String(options?.body)), {
        api_key: config.PAYMOB_API_KEY,
      });
      return response({ token: 'private_auth_token' });
    }
    assert.equal(
      url,
      'https://accept.paymob.com/api/ecommerce/orders/transaction_inquiry',
    );
    assert.equal(options?.method, 'POST');
    assert.equal(options?.redirect, 'error');
    assert.equal(
      (options?.headers as Record<string, string>).Authorization,
      'Bearer private_auth_token',
    );
    assert.deepEqual(JSON.parse(String(options?.body)), {
      auth_token: 'private_auth_token',
      merchant_order_id: reference,
    });
    return response({
      ...transaction,
      order: { ...transaction.order, merchant_order_id: reference },
      billing_data: { email: 'private@example.test' },
    });
  });
  const value = await provider.getTransactionByReference(reference);
  assert.equal(value.reference, reference);
  assert.equal(value.orderId, '4778239');
  assert.equal(calls, 2);
  assert.ok(!JSON.stringify(value).includes('private'));
  await assert.rejects(provider.getTransactionByReference('not-a-uuid'));
  assert.equal(calls, 2);
});

test('reference inquiry rejects mismatched scope, missing reference, live data and malformed results without retries', async () => {
  const reference = '00000000-0000-4000-8000-000000000001';
  const original = {
    ...transaction,
    order: { ...transaction.order, merchant_order_id: reference },
  };
  for (const patch of [
    { order: { id: 4778239 } },
    { order: { id: 4778239, merchant_order_id: 'other' } },
    { integration_id: 1 },
    { owner: 1 },
    { is_live: true },
    { currency: 'USD' },
    { captured_amount: 30001 },
    { id: '2556706' },
  ]) {
    let calls = 0;
    const provider = createPaymobProvider(config, async () => {
      calls++;
      return response(
        calls === 1 ? { token: 'private' } : { ...original, ...patch },
      );
    });
    await assert.rejects(
      provider.getTransactionByReference(reference),
      PaymentProviderError,
    );
    assert.equal(calls, 2);
  }
  for (const scenario of ['absent', 'timeout', 'json']) {
    let calls = 0;
    const provider = createPaymobProvider(config, async () => {
      calls++;
      if (calls === 1) return response({ token: 'private' });
      if (scenario === 'timeout') throw new Error('private details');
      if (scenario === 'json') return new Response('private invalid JSON');
      return response({}, 404);
    });
    await assert.rejects(
      provider.getTransactionByReference(reference),
      (error: unknown) =>
        error instanceof PaymentProviderError &&
        !error.message.includes('private'),
    );
    assert.equal(calls, 2);
  }
});
