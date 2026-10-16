import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import express from 'express';
import { createApp } from '../src/app.ts';
import { AppError } from '../src/errors/AppError.ts';
import { requireAuth } from '../src/middlewares/requireAuth.ts';
import { requireRole } from '../src/middlewares/requireRole.ts';
import { errorHandler } from '../src/middlewares/errorHandler.ts';
import {
  sessionService,
  type SessionService,
} from '../src/services/sessionService.ts';
import type { UserRole } from '../src/schemas/authSchema.ts';
import { cityService } from '../src/services/cityService.ts';
import { stationService } from '../src/services/stationService.ts';
import { busService } from '../src/services/busService.ts';
import { routeService } from '../src/services/routeService.ts';
import { tripService } from '../src/services/tripService.ts';

const sessions: SessionService = {
  ...sessionService,
  async authenticateAccessToken(token) {
    if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(token))
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    return {
      sessionId: randomUUID(),
      user: {
        id: randomUUID(),
        role: token as UserRole,
        name: 'Test',
        email: 'test@example.test',
        phone: '+201012345678',
        language: 'ar',
        emailVerifiedAt: '2026-01-01T00:00:00Z',
        createdAt: '2026-01-01T00:00:00Z',
      },
    };
  },
};
async function start(t: TestContext, app = createApp([], { sessions })) {
  const server = app.listen(0, '127.0.0.1');
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      ),
  );
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return 'http://127.0.0.1:' + address.port;
}
const id = randomUUID();
const protectedRoutes: [string, string][] = [
  ...['cities', 'stations', 'buses', 'routes', 'trips'].flatMap(
    (name) =>
      [
        ['POST', '/api/v1/' + name],
        ['PATCH', '/api/v1/' + name + '/' + id],
        ['DELETE', '/api/v1/' + name + '/' + id],
      ] as [string, string][],
  ),
  ...['buses', 'routes', 'trips'].flatMap(
    (name) =>
      [
        ['GET', '/api/v1/' + name],
        ['GET', '/api/v1/' + name + '/' + id],
        ['HEAD', '/api/v1/' + name],
      ] as [string, string][],
  ),
  ['GET', '/api/v1/buses/' + id + '/seats'],
  ['POST', '/api/v1/trips/batch'],
  ['POST', '/api/v1/trips/batch/preview'],
  ['GET', '/api/v1/admin/bookings'],
  ['GET', '/api/v1/admin/bookings/' + id],
  ['HEAD', '/api/v1/admin/bookings'],
  ['GET', '/api/v1/admin/users'],
  ['GET', '/api/v1/admin/users/' + id],
  ['HEAD', '/api/v1/admin/users'],
  ['PATCH', '/api/v1/admin/users/' + id + '/status'],
];

test('every catalog mutation and management read rejects anonymous and passenger requests before validation', async (t) => {
  const base = await start(t);
  for (const [method, path] of protectedRoutes) {
    for (const role of ['', 'USER']) {
      const response = await fetch(base + path, {
        method,
        headers: role ? { Authorization: 'Bearer ' + role } : {},
      });
      assert.equal(
        response.status,
        role ? 403 : 401,
        method + ' ' + path + ' ' + role,
      );
      assert.equal(response.headers.get('cache-control'), 'no-store');
      if (method !== 'HEAD')
        assert.equal(
          (await response.json()).error.code,
          role ? 'FORBIDDEN' : 'UNAUTHENTICATED',
        );
    }
  }
});

test('admin and super admin reach catalog controllers and authorized writes keep validation', async (t) => {
  const app = createApp([], {
    sessions,
    cities: {
      ...cityService,
      async create(input) {
        return { id, ...input };
      },
    },
    buses: {
      ...busService,
      async list() {
        return [];
      },
      async findById() {
        return null;
      },
    },
    routes: {
      ...routeService,
      async list() {
        return [];
      },
      async findById() {
        return null;
      },
    },
    adminUsers: {
      async list() {
        return [];
      },
      async findById() {
        return null;
      },
      async updateStatus() {
        return null;
      },
    },
    adminBookings: {
      async list() {
        return [];
      },
      async findById() {
        return null;
      },
    },
    trips: {
      ...tripService,
      async list() {
        return [];
      },
      async findById() {
        return null;
      },
    },
  });
  const base = await start(t, app);
  for (const role of ['ADMIN', 'SUPER_ADMIN']) {
    const headers = {
      Authorization: 'Bearer ' + role,
      'Content-Type': 'application/json',
    };
    assert.equal(
      (await fetch(base + '/api/v1/admin/bookings', { headers })).status,
      200,
    );
    assert.equal(
      (await fetch(base + '/api/v1/admin/bookings/' + id, { headers })).status,
      404,
    );
    assert.equal(
      (await fetch(base + '/api/v1/admin/users', { headers })).status,
      200,
    );
    assert.equal(
      (await fetch(base + '/api/v1/admin/users/' + id, { headers })).status,
      404,
    );
    assert.equal(
      (
        await fetch(base + '/api/v1/admin/users/' + id + '/status', {
          method: 'PATCH',
          headers,
          body: '{"isActive":false}',
        })
      ).status,
      404,
    );
    for (const suffix of ['/batch', '/batch/preview']) {
      assert.equal(
        (
          await fetch(base + '/api/v1/trips' + suffix, {
            method: 'POST',
            headers,
            body: '{}',
          })
        ).status,
        400,
      );
    }
    const created = await fetch(base + '/api/v1/cities', {
      method: 'POST',
      headers,
      body: JSON.stringify({ nameAr: 'القاهرة', nameEn: 'Cairo' }),
    });
    assert.equal(created.status, 201);
    for (const name of ['cities', 'stations', 'buses', 'routes', 'trips']) {
      const response = await fetch(base + '/api/v1/' + name, {
        method: 'POST',
        headers,
        body: '{}',
      });
      assert.equal(response.status, 400, name);
      const invalid = await fetch(base + '/api/v1/' + name + '/invalid', {
        method: 'DELETE',
        headers,
      });
      assert.equal(invalid.status, 400, name);
    }
    for (const name of ['buses', 'routes', 'trips']) {
      assert.equal(
        (await fetch(base + '/api/v1/' + name, { headers })).status,
        200,
      );
      assert.equal(
        (await fetch(base + '/api/v1/' + name + '/' + id, { headers })).status,
        404,
      );
    }
  }
});

test('public city/station lookup and passenger trip routes stay accessible without authentication', async (t) => {
  const base = await start(
    t,
    createApp([], {
      cities: {
        ...cityService,
        async list() {
          return [];
        },
      },
      stations: {
        ...stationService,
        async list() {
          return [];
        },
      },
    }),
  );
  for (const name of ['cities', 'stations'])
    assert.equal((await fetch(base + '/api/v1/' + name)).status, 200);
  assert.equal((await fetch(base + '/api/v1/health')).status, 200);
  for (const path of [
    '/trips/search',
    '/trips/invalid/details',
    '/trips/invalid/seats',
  ])
    assert.equal((await fetch(base + '/api/v1' + path)).status, 400, path);
});

test('role checks fail closed, distinguish super admin and never trust request-supplied roles', async (t) => {
  const app = express();
  app.get('/missing', requireRole('SUPER_ADMIN'), (_req, res) =>
    res.sendStatus(200),
  );
  app.get(
    '/super',
    requireAuth(sessions),
    requireRole('SUPER_ADMIN'),
    (_req, res) => res.sendStatus(200),
  );
  app.use(errorHandler);
  const base = await start(t, app);
  assert.equal((await fetch(base + '/missing')).status, 401);
  for (const role of ['USER', 'ADMIN', 'SUPER_ADMIN'])
    assert.equal(
      (
        await fetch(base + '/super', {
          headers: { Authorization: 'Bearer ' + role, 'X-Role': 'SUPER_ADMIN' },
        })
      ).status,
      role === 'SUPER_ADMIN' ? 200 : 403,
    );
  const catalog = await start(t);
  const denied = await fetch(catalog + '/api/v1/cities', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer USER',
      'Content-Type': 'application/json',
      'X-Role': 'SUPER_ADMIN',
      Cookie: 'role=SUPER_ADMIN',
    },
    body: JSON.stringify({
      nameAr: 'اختبار',
      nameEn: 'Test',
      role: 'SUPER_ADMIN',
    }),
  });
  assert.equal(denied.status, 403);
  assert.equal(
    (
      await fetch(catalog + '/api/v1/buses', {
        headers: { Authorization: 'Bearer invalid' },
      })
    ).status,
    401,
  );
});

test('registration rejects role escalation and never calls account creation for supplied privilege fields', async (t) => {
  let calls = 0;
  const app = createApp([], {
    auth: {
      async register() {
        calls++;
        return id;
      },
      async verifyEmail() {},
      async resendVerification() {},
    },
  });
  const base = await start(t, app);
  for (const field of ['role', 'isAdmin', 'isActive', 'emailVerifiedAt']) {
    const response = await fetch(base + '/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test',
        email: 'test@example.test',
        phone: '+201012345678',
        password: 'Long-password-2026',
        [field]: 'SUPER_ADMIN',
      }),
    });
    assert.equal(response.status, 400);
  }
  assert.equal(calls, 0);
});
