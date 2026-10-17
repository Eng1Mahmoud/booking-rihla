import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  bookingState,
  holdDurationMs,
} from '../src/services/bookingHoldService.ts';
test('holds expire at the exact deadline; legacy reservations remain reserved', () => {
  const expiresAt = '2026-10-17T12:10:00.000Z',
    deadline = Date.parse(expiresAt);
  assert.equal(holdDurationMs, 600000);
  assert.equal(
    bookingState({ status: 'PENDING_PAYMENT', expiresAt }, deadline - 1),
    'PENDING_PAYMENT',
  );
  assert.equal(
    bookingState({ status: 'PENDING_PAYMENT', expiresAt }, deadline),
    'EXPIRED',
  );
  assert.equal(
    bookingState({ status: 'PENDING_PAYMENT', expiresAt }, deadline + 1),
    'EXPIRED',
  );
  assert.equal(
    bookingState({ status: 'RESERVED', expiresAt: null }, deadline + 1),
    'RESERVED',
  );
  assert.equal(
    bookingState({ status: 'EXPIRED', expiresAt }, deadline - 1),
    'EXPIRED',
  );
});
