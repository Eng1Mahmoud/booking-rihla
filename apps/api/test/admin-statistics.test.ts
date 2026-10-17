import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../src/app.ts';
import { AppError } from '../src/errors/AppError.ts';
import {
  sessionService,
  type SessionService,
} from '../src/services/sessionService.ts';
import { adminStatisticsQuerySchema } from '../src/schemas/adminStatisticsSchema.ts';
import { cairoToday } from '../src/utils/cairoTime.ts';
const sessions: SessionService = {
  ...sessionService,
  async authenticateAccessToken(token) {
    if (token !== 'USER' && token !== 'ADMIN' && token !== 'SUPER_ADMIN')
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    return {
      sessionId: randomUUID(),
      user: {
        id: randomUUID(),
        name: 'Operator',
        email: 'operator@example.test',
        phone: '+201012345678',
        role: token,
        language: 'ar',
        emailVerifiedAt: '2026-01-01T00:00:00Z',
        createdAt: '2026-01-01T00:00:00Z',
      },
    };
  },
};
test('statistics defaults to Cairo today and rejects unsupported date/query shapes', () => {
  assert.deepEqual(adminStatisticsQuerySchema.parse({}), {
    travelDate: cairoToday(),
  });
  for (const query of [
    { travelDate: '2025-02-29' },
    { travelDate: '1999-12-31' },
    { travelDate: '9999-01-01' },
    { travelDate: ['2026-10-17'] },
    { travelDate: '' },
    { start: '2026-10-17' },
    { revenue: 'true' },
  ])
    assert.equal(adminStatisticsQuerySchema.safeParse(query).success, false);
});
test('statistics authenticates staff before validation and hides unexpected failures', async (t) => {
  let calls = 0;
  const server = createApp([], {
    sessions,
    adminStatistics: {
      async get() {
        calls++;
        throw new Error('private-database-secret');
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
  const base = 'http://127.0.0.1:' + address.port + '/api/v1/admin/statistics';
  assert.equal((await fetch(base + '?bad=true')).status, 401);
  assert.equal(
    (
      await fetch(base + '?bad=true', {
        headers: { Authorization: 'Bearer USER' },
      })
    ).status,
    403,
  );
  assert.equal(calls, 0);
  for (const role of ['ADMIN', 'SUPER_ADMIN']) {
    const headers = { Authorization: 'Bearer ' + role };
    for (const query of [
      '?travelDate=2025-02-29',
      '?travelDate=2026-10-17&travelDate=2026-10-18',
      '?unexpected=true',
    ]) {
      const invalid = await fetch(base + query, { headers });
      assert.equal(invalid.status, 400);
      assert.equal(invalid.headers.get('cache-control'), 'no-store');
    }
    assert.equal(calls, role === 'ADMIN' ? 0 : 1);
    const failed = await fetch(base, { headers });
    assert.equal(failed.status, 500);
    assert.ok(!JSON.stringify(await failed.json()).includes('private'));
  }
  assert.equal(calls, 2);
});
