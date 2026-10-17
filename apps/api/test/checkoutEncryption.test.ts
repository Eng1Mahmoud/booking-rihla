import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  checkoutKey,
  encryptCheckout,
  decryptCheckout,
} from '../src/payments/checkoutEncryption.ts';
import {
  createPaymentAuthorizationService,
  startPaymentAuthorization,
} from '../src/services/paymentAuthorizationService.ts';
test('checkout encryption binds ciphertext to its operation and uses fresh authenticated nonces', () => {
  const key = Buffer.alloc(32, 7),
    url =
      'https://accept.paymob.com/unifiedcheckout/?clientSecret=csk_test_fixture';
  const first = encryptCheckout('one', url, key),
    second = encryptCheckout('one', url, key);
  assert.notEqual(first, second);
  assert.ok(!first.includes('csk_test'));
  assert.equal(decryptCheckout('one', first, key), url);
  for (const [id, payload, secret] of [
    ['two', first, key],
    ['one', first, Buffer.alloc(32, 8)],
    ['one', first.slice(0, -4), key],
    ['one', 'v2.x.x.x', key],
  ] as const)
    assert.throws(
      () => decryptCheckout(id, payload, secret),
      /Unable to decrypt payment checkout/,
    );
});
test('checkout keys are independent, validated and never included in errors', () => {
  assert.equal(
    checkoutKey({ PAYMENT_CHECKOUT_SECRET: 'ab'.repeat(32) }).length,
    32,
  );
  for (const value of [undefined, '', 'secret', 'a'.repeat(63)])
    assert.throws(() => checkoutKey({ PAYMENT_CHECKOUT_SECRET: value }), {
      message: 'Invalid payment configuration: PAYMENT_CHECKOUT_SECRET',
    });
  assert.throws(
    () =>
      createPaymentAuthorizationService({
        provider: {
          createAuthorization: async () => {
            throw new Error();
          },
        },
        integrationId: 1,
        ownerId: 1,
        encryptionKey: Buffer.alloc(31),
      }),
    /Invalid payment checkout encryption key/,
  );
});
test('default authorization creation remains disabled without opt-in, before database/network access', async () => {
  const previous = process.env['PAYMOB_ENABLED'];
  process.env['PAYMOB_ENABLED'] = 'false';
  try {
    await assert.rejects(
      startPaymentAuthorization(
        { user: { id: 'unused' }, sessionId: 'unused' } as Parameters<
          typeof startPaymentAuthorization
        >[0],
        'unused',
      ),
      { code: 'PAYMENT_UNAVAILABLE' },
    );
  } finally {
    if (previous === undefined) delete process.env['PAYMOB_ENABLED'];
    else process.env['PAYMOB_ENABLED'] = previous;
  }
});
