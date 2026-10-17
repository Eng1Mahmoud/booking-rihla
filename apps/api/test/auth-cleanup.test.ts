import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  authCleanupCutoffs,
  authRetentionMs,
  cleanupAuthData,
} from '../src/services/authCleanupService.ts';
test('authentication cleanup uses an elapsed 24-hour retention boundary', () => {
  const now = Date.parse('2026-10-30T10:00:00+02:00');
  assert.deepEqual(authCleanupCutoffs(now), {
    expiredAt: '2026-10-30T08:00:00.000Z',
    deleteBefore: '2026-10-29T08:00:00.000Z',
  });
  assert.equal(authRetentionMs, 86400000);
});
test('cleanup rejects invalid timestamps and unsafe batch sizes before accessing the database', async () => {
  for (const now of [
    NaN,
    Infinity,
    -Infinity,
    8640000000000000,
    -8640000000000000,
  ])
    assert.throws(() => authCleanupCutoffs(now), /Invalid cleanup timestamp/);
  for (const limit of [0, -1, 1.5, 1001, Infinity, NaN])
    await assert.rejects(
      cleanupAuthData({ limit }),
      /Invalid cleanup batch size/,
    );
});
