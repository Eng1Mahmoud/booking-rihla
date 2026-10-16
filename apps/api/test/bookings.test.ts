import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import { createApp } from '../src/app.ts';
import { AppError } from '../src/errors/AppError.ts';
import {
  sessionService,
  type SessionService,
  type AuthContext,
} from '../src/services/sessionService.ts';
import type { BookingService } from '../src/services/bookingService.ts';
const user = {
  id: randomUUID(),
  role: 'USER' as const,
  name: 'Passenger',
  email: 'passenger@example.test',
  phone: '+201012345678',
  language: 'ar',
  emailVerifiedAt: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
};
const auth: AuthContext = { user, sessionId: randomUUID() };
const sessions: SessionService = {
  ...sessionService,
  async authenticateAccessToken(token) {
    if (token !== 'valid')
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    return auth;
  },
};
const originCity = { id: randomUUID(), nameAr: 'القاهرة', nameEn: 'Cairo' },
  destinationCity = {
    id: randomUUID(),
    nameAr: 'الإسكندرية',
    nameEn: 'Alexandria',
  };
const origin = {
    id: randomUUID(),
    cityId: originCity.id,
    nameAr: 'رمسيس',
    nameEn: 'Ramses',
    city: originCity,
  },
  destination = {
    id: randomUUID(),
    cityId: destinationCity.id,
    nameAr: 'محرم بك',
    nameEn: 'Moharam Bek',
    city: destinationCity,
  };
const booking = {
  id: randomUUID(),
  reference: 'BUS-1234567890ABCDEF',
  status: 'RESERVED' as const,
  paymentRequired: false,
  currency: 'EGP',
  contactPhone: '+201012345678',
  seatCount: 1,
  unitPricePiastres: 25000,
  totalPiastres: 25000,
  createdAt: '2026-01-01T00:00:00.000Z',
  trip: {
    id: randomUUID(),
    busId: randomUUID(),
    departureAt: '2099-01-01T08:00:00.000Z',
    arrivalAt: '2099-01-01T11:00:00.000Z',
    route: {
      id: randomUUID(),
      originStationId: origin.id,
      destinationStationId: destination.id,
      estimatedDurationMinutes: 180,
      isActive: true,
      originStation: origin,
      destinationStation: destination,
    },
  },
  passengers: [{ seatId: randomUUID(), seatNumber: 1, name: 'Mahmoud' }],
};
const valid = {
  tripId: booking.trip.id,
  contactPhone: booking.contactPhone,
  passengers: [{ seatId: booking.passengers[0]!.seatId, name: '  Mahmoud  ' }],
};
const headers = {
  Authorization: 'Bearer valid',
  'Content-Type': 'application/json',
};
function fakeService(): BookingService {
  return {
    async create() {
      return booking;
    },
    async list() {
      return [booking];
    },
    async findById(userId, id) {
      return userId === user.id && id === booking.id ? booking : null;
    },
  };
}
async function start(t: TestContext, service = fakeService()) {
  const server = createApp([], { sessions, bookings: service }).listen(
    0,
    '127.0.0.1',
  );
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return 'http://127.0.0.1:' + address.port + '/api/v1/bookings';
}

test('reservation creation uses the authenticated owner, trims names and returns a reference with Location', async (t) => {
  const service = fakeService();
  let received: unknown;
  service.create = async (context, input) => {
    received = { context, input };
    return booking;
  };
  const base = await start(t, service);
  const response = await fetch(base, {
    method: 'POST',
    headers,
    body: JSON.stringify(valid),
  });
  assert.equal(response.status, 201);
  assert.equal(
    response.headers.get('location'),
    '/api/v1/bookings/' + booking.id,
  );
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { data: booking });
  assert.deepEqual(received, {
    context: auth,
    input: {
      ...valid,
      passengers: [{ ...valid.passengers[0], name: 'Mahmoud' }],
    },
  });
});

test('every booking endpoint requires bearer authentication and ignores refresh cookies as credentials', async (t) => {
  const base = await start(t);
  for (const [method, path] of [
    ['GET', ''],
    ['GET', '/' + booking.id],
    ['POST', ''],
    ['DELETE', '/' + booking.id],
  ]) {
    const response = await fetch(base + path, {
      method,
      headers: { Cookie: 'bus_refresh=pretend' },
    });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.equal(
    (await fetch(base, { headers: { Authorization: 'Bearer invalid' } }))
      .status,
    401,
  );
});

test('reservation bodies reject supplied prices/owners/status, duplicate seats and invalid passenger input', async (t) => {
  const service = fakeService();
  let calls = 0;
  service.create = async () => {
    calls++;
    return booking;
  };
  const base = await start(t, service);
  const invalid = [
    ...[
      'id',
      'userId',
      'reference',
      'status',
      'unitPricePiastres',
      'totalPiastres',
      'currency',
    ].map((field) => ({ ...valid, [field]: 'not-allowed' })),
    { ...valid, layoutId: 'invalid' },
    { ...valid, tripId: 'invalid' },
    { ...valid, contactPhone: '01012345678' },
    { ...valid, passengers: [] },
    { ...valid, passengers: [valid.passengers[0], valid.passengers[0]] },
    { ...valid, passengers: [{ seatId: randomUUID(), name: '   ' }] },
    { ...valid, passengers: [{ seatId: 'invalid', name: 'Passenger' }] },
    {
      ...valid,
      passengers: [{ seatId: randomUUID(), name: 'Passenger', role: 'ADMIN' }],
    },
    {
      ...valid,
      passengers: Array.from({ length: 101 }, () => ({
        seatId: randomUUID(),
        name: 'Passenger',
      })),
    },
  ];
  for (const body of invalid)
    assert.equal(
      (
        await fetch(base, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })
      ).status,
      400,
    );
  assert.equal(
    (
      await fetch(base + '?userId=' + user.id, {
        method: 'POST',
        headers,
        body: JSON.stringify(valid),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await fetch(base, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid',
          'Content-Type': 'text/plain',
        },
        body: 'anything',
      })
    ).status,
    415,
  );
  assert.equal(calls, 0);
});

test('my bookings and details scope service calls to the authenticated owner and validate pagination', async (t) => {
  const service = fakeService();
  let received: unknown;
  service.list = async (owner, query) => {
    received = { owner, query };
    return [booking];
  };
  const base = await start(t, service);
  const page = await fetch(base + '?limit=5&offset=2', { headers });
  assert.equal(page.status, 200);
  assert.deepEqual(await page.json(), {
    data: [booking],
    pagination: { limit: 5, offset: 2 },
  });
  assert.deepEqual(received, {
    owner: user.id,
    query: { limit: 5, offset: 2 },
  });
  assert.deepEqual(
    await (await fetch(base + '/' + booking.id, { headers })).json(),
    { data: booking },
  );
  assert.equal(
    (await fetch(base + '/' + randomUUID(), { headers })).status,
    404,
  );
  for (const path of [
    '?userId=' + randomUUID(),
    '?limit=101',
    '?offset=-1',
    '?limit=2&limit=3',
    '/invalid',
    '/' + booking.id + '?userId=' + user.id,
  ])
    assert.equal((await fetch(base + path, { headers })).status, 400, path);
});

test('reservation errors preserve safe conflicts and hide unexpected database failures', async (t) => {
  const service = fakeService();
  service.create = async () => {
    throw new AppError(
      409,
      'SEAT_UNAVAILABLE',
      'One or more selected seats are already reserved',
    );
  };
  const base = await start(t, service);
  const conflict = await fetch(base, {
    method: 'POST',
    headers,
    body: JSON.stringify(valid),
  });
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).error.code, 'SEAT_UNAVAILABLE');
  for (const name of ['create', 'list', 'findById'] as const)
    service[name] = async () => {
      throw Error('private database/password details');
    };
  for (const [method, path] of [
    ['POST', ''],
    ['GET', ''],
    ['GET', '/' + booking.id],
  ]) {
    const response = await fetch(base + path, {
      method,
      headers,
      ...(method === 'POST' ? { body: JSON.stringify(valid) } : {}),
    });
    assert.equal(response.status, 500);
    assert.doesNotMatch(await response.text(), /private|password|database/);
  }
});

test('passengers have no cancellation, update or delete endpoint for their reservation', async (t) => {
  const service = fakeService();
  let calls = 0;
  service.create = async () => {
    calls++;
    return booking;
  };
  const base = await start(t, service);
  for (const [method, path] of [
    ['DELETE', '/' + booking.id],
    ['PATCH', '/' + booking.id],
    ['POST', '/' + booking.id + '/cancel'],
    ['POST', '/' + booking.id + '/cancellation'],
  ]) {
    const response = await fetch(base + path, { method, headers, body: '{}' });
    assert.equal(response.status, 404);
  }
  assert.equal(calls, 0);
  assert.deepEqual(
    await (await fetch(base + '/' + booking.id, { headers })).json(),
    { data: booking },
  );
});

test('reservation creation IP limit returns safe 429 and Retry-After', async (t) => {
  const base = await start(t);
  for (let i = 0; i < 20; i++)
    assert.equal(
      (
        await fetch(base, {
          method: 'POST',
          headers,
          body: JSON.stringify(valid),
        })
      ).status,
      201,
    );
  const response = await fetch(base, {
    method: 'POST',
    headers,
    body: JSON.stringify(valid),
  });
  assert.equal(response.status, 429);
  assert.ok(response.headers.get('retry-after'));
  assert.equal((await response.json()).error.code, 'RATE_LIMITED');
});

test('booking passes the displayed layout id to the service and rejects malformed layout identities', async (t) => {
  const service = fakeService();
  let received: unknown;
  service.create = async (_auth, input) => {
    received = input;
    return booking;
  };
  const base = await start(t, service),
    layoutId = randomUUID();
  const response = await fetch(base, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...valid, layoutId }),
  });
  assert.equal(response.status, 201);
  assert.equal((received as { layoutId: string }).layoutId, layoutId);
  const invalid = await fetch(base, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...valid, layoutId: 'invalid' }),
  });
  assert.equal(invalid.status, 400);
});
