import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../src/app.ts';
import { parsePaymobWebhookEnv } from '../src/config/paymob.ts';
import { AppError } from '../src/errors/AppError.ts';
import {
  validatePaymobEvent,
  paymobWebhookService,
} from '../src/services/paymobWebhookService.ts';
import {
  callbackFixture,
  signCallback,
  webhookEnvironment,
} from './helpers/paymobFixture.ts';
const config = parsePaymobWebhookEnv(webhookEnvironment)!;
const signature = signCallback(callbackFixture);

test('webhook preparation is opt-in, needs signing/integration settings and can leave owner unknown', () => {
  assert.equal(parsePaymobWebhookEnv({}), null);
  assert.equal(
    parsePaymobWebhookEnv({ PAYMOB_WEBHOOK_ENABLED: 'false' }),
    null,
  );
  assert.equal(config.PAYMOB_OWNER_ID, undefined);
  for (const overrides of [
    { PAYMOB_WEBHOOK_ENABLED: 'yes' },
    { PAYMOB_HMAC_SECRET: '' },
    { PAYMOB_INTEGRATION_ID: '0' },
    { PAYMOB_OWNER_ID: 'private_invalid' },
  ])
    assert.throws(
      () => parsePaymobWebhookEnv({ ...webhookEnvironment, ...overrides }),
      (error: unknown) =>
        error instanceof Error &&
        error.message.startsWith('Invalid webhook configuration:') &&
        !error.message.includes('private'),
    );
  assert.throws(
    () => validatePaymobEvent(callbackFixture, signature, null),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );
});

test('receipt validates HMAC, integration, EGP and configured owner before persistence', () => {
  const safe = validatePaymobEvent(callbackFixture, signature, config);
  assert.equal(safe.ownerId, 4705);
  for (const overrides of [
    { integration_id: 1 },
    { currency: 'USD' },
    { owner: 9 },
  ]) {
    const body = {
      ...callbackFixture,
      obj: { ...callbackFixture.obj, ...overrides },
    };
    assert.throws(
      () =>
        validatePaymobEvent(body, signCallback(body), {
          ...config,
          PAYMOB_OWNER_ID: 4705,
        }),
      (error: unknown) => error instanceof AppError && error.statusCode === 403,
    );
  }
  assert.throws(
    () => validatePaymobEvent(callbackFixture, '0'.repeat(128), config),
    (error: unknown) => error instanceof AppError && error.statusCode === 401,
  );
  const extra = {
    ...callbackFixture,
    obj: {
      ...callbackFixture.obj,
      is_live: false,
      customer: { email: 'private@example.test' },
      captured_amount: 100,
    },
  };
  assert.deepEqual(validatePaymobEvent(extra, signature, config), safe);
  const encoded = JSON.stringify(safe);
  for (const field of [
    'source_data',
    'pan',
    'is_live',
    'captured_amount',
    'customer',
    'private@example.test',
  ])
    assert.ok(!encoded.includes(field));
});

test('disabled or forged real service callbacks fail before importing a database', async (t) => {
  const keys = Object.keys(webhookEnvironment);
  const old = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  t.after(() => {
    for (const key of keys) {
      if (old[key] === undefined) delete process.env[key];
      else process.env[key] = old[key];
    }
  });
  Object.assign(process.env, webhookEnvironment, {
    PAYMOB_WEBHOOK_ENABLED: 'false',
  });
  await assert.rejects(
    paymobWebhookService.receive(callbackFixture, signature),
    /not enabled/,
  );
  process.env['PAYMOB_WEBHOOK_ENABLED'] = 'true';
  await assert.rejects(
    paymobWebhookService.receive(callbackFixture, '0'.repeat(128)),
    /Invalid payment notification/,
  );
});

test('webhook HTTP acknowledges only persisted receipt, rejects malformed requests and hides storage errors', async (t) => {
  let received = 0;
  let fail = false;
  const server = createApp([], {
    paymobWebhook: {
      async receive(body, hmac) {
        validatePaymobEvent(body, hmac, config);
        if (fail) throw new Error('private database credentials');
        received++;
      },
    },
  }).listen(0, '127.0.0.1');
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      ),
  );
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base =
    'http://127.0.0.1:' + address.port + '/api/v1/payments/paymob/webhook';
  const post = (
    suffix = '?hmac=' + signature,
    body = JSON.stringify(callbackFixture),
    type = 'application/json',
  ) =>
    fetch(base + suffix, {
      method: 'POST',
      headers: { 'Content-Type': type },
      body,
    });
  const ok = await post();
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await ok.json(), { received: true });
  assert.equal(received, 1);
  for (const suffix of [
    '',
    '?hmac=no',
    '?hmac=' + signature + '&hmac=' + signature,
    '?hmac=' + signature + '&extra=yes',
  ])
    assert.equal((await post(suffix)).status, 400);
  assert.equal((await post('?hmac=' + '0'.repeat(128))).status, 401);
  assert.equal((await post(undefined, '{}', 'text/plain')).status, 415);
  assert.equal((await post(undefined, '{')).status, 400);
  assert.equal(
    (await post(undefined, JSON.stringify({ data: 'x'.repeat(102400) })))
      .status,
    413,
  );
  assert.equal(received, 1);
  assert.equal((await fetch(base + '?hmac=' + signature)).status, 404);
  fail = true;
  const failed = await post();
  assert.equal(failed.status, 500);
  assert.deepEqual(await failed.json(), {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
  assert.equal(received, 1);
});
