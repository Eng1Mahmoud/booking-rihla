import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import {
  verifiedPayment,
  verifiedReferencePayment,
} from '../src/payments/paymentVerification.ts';
import { bookingState } from '../src/services/bookingHoldService.ts';
const remote = {
  id: '1234',
  orderId: '4321',
  integrationId: 6741,
  ownerId: 4705,
  amountPiastres: 25000,
  currency: 'EGP',
  pending: false,
  success: true,
  authorization: true,
  capture: false,
  voided: false,
  refunded: false,
  standalone: false,
  live: false,
  capturedPiastres: 0,
};
const expected = {
  transactionId: '1234',
  orderId: '4321',
  integrationId: '6741',
  ownerId: '4705',
  amountPiastres: 25000n,
};
test('authenticated inquiry must match transaction, order, owner, integration, TEST mode and exact piastres', () => {
  assert.deepEqual(verifiedPayment(remote, expected), remote);
  for (const patch of [
    { id: '9' },
    { orderId: '9' },
    { ownerId: 9 },
    { integrationId: 9 },
    { live: true },
    { currency: 'USD' },
    { amountPiastres: 1 },
    { amountPiastres: 1.5 },
    { capturedPiastres: 25001 },
    { capturedPiastres: -1 },
    { pending: 'false' },
    { success: undefined },
  ])
    assert.equal(verifiedPayment({ ...remote, ...patch }, expected), null);
  assert.equal(verifiedPayment(null, expected), null);
  assert.equal(
    verifiedPayment(remote, { ...expected, amountPiastres: 25001n }),
    null,
  );
});
test('processing and confirmed bookings keep seats past the original hold expiry', () => {
  const expiresAt = '2020-01-01T00:00:00Z';
  assert.equal(
    bookingState({ status: 'PAYMENT_PROCESSING', expiresAt }),
    'PAYMENT_PROCESSING',
  );
  assert.equal(bookingState({ status: 'CONFIRMED', expiresAt }), 'CONFIRMED');
  assert.equal(
    bookingState({ status: 'PENDING_PAYMENT', expiresAt }),
    'EXPIRED',
  );
});
test('payment worker is opt-in, starts without database access when disabled and rejects invalid configuration safely', () => {
  for (const [flag, status, pattern] of [
    ['false', 0, /disabled/],
    ['invalid', 1, /configuration is invalid/],
    ['true', 1, /configuration is invalid/],
  ] as const) {
    const result = spawnSync(
      process.execPath,
      ['src/workers/paymentWorker.ts', '--once'],
      {
        cwd: new URL('..', import.meta.url),
        env: {
          ...process.env,
          PAYMOB_RECONCILIATION_ENABLED: flag,
          PAYMOB_ENABLED: 'false',
          DATABASE_URL: 'invalid',
          PAYMOB_SECRET_KEY: 'private_test_secret',
        },
        encoding: 'utf8',
        timeout: 10000,
      },
    );
    assert.ifError(result.error);
    assert.equal(result.status, status);
    assert.match(result.stdout + result.stderr, pattern);
    assert.ok(!(result.stdout + result.stderr).includes('private_test_secret'));
  }
});

test('recovered reference and existing order must match alongside the complete financial scope', () => {
  const reference = '00000000-0000-4000-8000-000000000001';
  const value = { ...remote, reference };
  assert.deepEqual(
    verifiedReferencePayment(value, { ...expected, reference, orderId: null }),
    remote,
  );
  assert.deepEqual(
    verifiedReferencePayment(value, { ...expected, reference }),
    remote,
  );
  for (const patch of [
    { reference: 'other' },
    { reference: undefined },
    { live: true },
    { amountPiastres: 1 },
    { ownerId: 1 },
    { integrationId: 1 },
    { currency: 'USD' },
    { orderId: '0' },
  ])
    assert.equal(
      verifiedReferencePayment(
        { ...value, ...patch },
        { ...expected, reference, orderId: null },
      ),
      null,
    );
  assert.equal(
    verifiedReferencePayment(value, {
      ...expected,
      reference,
      orderId: '9999',
    }),
    null,
  );
});
