import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import { createApp } from '../src/app.ts';
import {
  sessionService,
  type SessionService,
} from '../src/services/sessionService.ts';
import type { AuditLogService } from '../src/services/auditLogService.ts';
import { recordAudit, type AuditActor } from '../src/services/auditWriter.ts';
import { AppError } from '../src/errors/AppError.ts';
const actor = { user: { id: randomUUID(), role: 'SUPER_ADMIN' } } as AuditActor;
const sessions: SessionService = {
  ...sessionService,
  async authenticateAccessToken(token) {
    if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(token))
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    return {
      sessionId: randomUUID(),
      user: { ...actor.user, role: token },
    } as Awaited<ReturnType<SessionService['authenticateAccessToken']>>;
  },
};
const empty: AuditLogService = {
  async list() {
    return [];
  },
  async findById() {
    return null;
  },
};
async function start(t: TestContext, service = empty) {
  const server = createApp([], { sessions, auditLogs: service }).listen(
    0,
    '127.0.0.1',
  );
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      ),
  );
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return 'http://127.0.0.1:' + address.port + '/api/v1/admin/audit-logs';
}
const headers = { Authorization: 'Bearer SUPER_ADMIN' };
test('audit reads require a super admin and expose no mutation endpoints', async (t) => {
  const base = await start(t);
  for (const role of ['', 'USER', 'ADMIN']) {
    const r = await fetch(base, {
      headers: { Authorization: role ? 'Bearer ' + role : '' },
    });
    assert.equal(r.status, role ? 403 : 401);
    assert.match(r.headers.get('cache-control') ?? '', /no-store/);
  }
  assert.equal((await fetch(base, { headers })).status, 200);
  for (const method of ['POST', 'PATCH', 'DELETE'])
    assert.equal((await fetch(base, { method, headers })).status, 404);
});
test('audit query validation supports combined filters and rejects unknown or invalid inputs', async (t) => {
  let called = 0;
  const id = randomUUID();
  const base = await start(t, {
    ...empty,
    async list(query) {
      called++;
      assert.deepEqual(query, {
        actorId: id,
        entity: 'User',
        entityId: id,
        action: 'UPDATE',
        from: '2026-01-01T00:00:00Z',
        to: '2026-01-02T00:00:00Z',
        limit: 2,
        offset: 1,
      });
      return [];
    },
  });
  const q = new URLSearchParams({
    actorId: id,
    entity: 'User',
    entityId: id,
    action: 'UPDATE',
    from: '2026-01-01T00:00:00Z',
    to: '2026-01-02T00:00:00Z',
    limit: '2',
    offset: '1',
  });
  const response = await fetch(base + '?' + q, { headers });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).pagination, { limit: 2, offset: 1 });
  for (const query of [
    'actorId=no',
    'entity=Session',
    'entityId=no',
    'action=LOGIN',
    'from=yesterday',
    'from=2026-02-01T00:00:00Z&to=2026-01-01T00:00:00Z',
    'limit=101',
    'offset=-1',
    'email=private@example.test',
    'entity=User&entity=Bus',
  ])
    assert.equal(
      (await fetch(base + '?' + query, { headers })).status,
      400,
      query,
    );
  assert.equal(called, 1);
});
test('audit details validate ids, return safe missing/errors and preserve no-store', async (t) => {
  const base = await start(t);
  assert.equal((await fetch(base + '/bad', { headers })).status, 400);
  assert.equal(
    (await fetch(base + '/' + randomUUID() + '?extra=1', { headers })).status,
    400,
  );
  const missing = await fetch(base + '/' + randomUUID(), { headers });
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, 'AUDIT_LOG_NOT_FOUND');
  const failing = await start(t, {
    ...empty,
    async list() {
      throw new Error('private database password');
    },
  });
  const failed = await fetch(failing, { headers });
  assert.equal(failed.status, 500);
  assert.ok(!(await failed.text()).includes('private database password'));
});
test('audit writer allowlists user fields, skips no-ops and propagates insert failures', async () => {
  type Tx = Parameters<typeof recordAudit>[0];
  const rows: Record<string, unknown>[] = [];
  const tx = {
    orm: {
      public: {
        AuditLog: {
          async create(row: Record<string, unknown>) {
            rows.push(row);
          },
        },
      },
    },
  } as unknown as Tx;
  const id = randomUUID(),
    before = {
      role: 'USER',
      isActive: true,
      passwordHash: 'secret',
      email: 'private@example.test',
    };
  await recordAudit(tx, actor, 'User', id, before, {
    ...before,
    role: 'ADMIN',
  });
  assert.deepEqual(rows[0], {
    actorId: actor.user.id,
    actorRole: 'SUPER_ADMIN',
    entity: 'User',
    entityId: id,
    action: 'UPDATE',
    beforeJson: '{"role":"USER","isActive":true}',
    afterJson: '{"role":"ADMIN","isActive":true}',
  });
  await recordAudit(tx, actor, 'User', id, before, {
    ...before,
    passwordHash: 'different',
  });
  assert.equal(rows.length, 1);
  await recordAudit(
    tx,
    undefined,
    'User',
    id,
    before,
    { ...before, role: 'SUPER_ADMIN' },
    'BOOTSTRAP',
  );
  assert.equal(rows[1]!.actorId, null);
  assert.equal(rows[1]!.action, 'BOOTSTRAP');
  const fail = {
    orm: {
      public: {
        AuditLog: {
          async create() {
            throw new Error('insert failed');
          },
        },
      },
    },
  } as unknown as Tx;
  await assert.rejects(
    recordAudit(fail, actor, 'User', id, before, {
      ...before,
      isActive: false,
    }),
    /insert failed/,
  );
});
