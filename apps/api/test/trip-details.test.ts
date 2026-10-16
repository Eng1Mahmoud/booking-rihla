import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import { createApp } from '../src/app.ts';
import type { TripDetailsService } from '../src/services/tripDetailsService.ts';

const city = { id: randomUUID(), nameAr: 'القاهرة', nameEn: 'Cairo' };
const destinationCity = {
  id: randomUUID(),
  nameAr: 'الإسكندرية',
  nameEn: 'Alexandria',
};
const originStation = {
  id: randomUUID(),
  cityId: city.id,
  nameAr: 'رمسيس',
  nameEn: 'Ramses',
  city,
};
const destinationStation = {
  id: randomUUID(),
  cityId: destinationCity.id,
  nameAr: 'محرم بك',
  nameEn: 'Moharam Bek',
  city: destinationCity,
};
const route = {
  id: randomUUID(),
  originStationId: originStation.id,
  destinationStationId: destinationStation.id,
  estimatedDurationMinutes: 180,
  isActive: true,
  originStation,
  destinationStation,
};
const bus = { id: randomUUID(), seatCount: 2, busType: null, amenities: [] };
const details: NonNullable<
  Awaited<ReturnType<TripDetailsService['findById']>>
> = {
  id: randomUUID(),
  routeId: route.id,
  busId: bus.id,
  departureAt: '2099-01-01T08:00:00.000Z',
  arrivalAt: '2099-01-01T11:00:00.000Z',
  pricePiastres: 25000,
  status: 'SCHEDULED',
  route,
  bus,
};
const seats = {
  tripId: details.id,
  busId: bus.id,
  totalSeats: 2,
  availableSeats: 2,
  seats: [1, 2].map((number) => ({
    id: randomUUID(),
    number,
    isAvailable: true,
  })),
};
function fakeService(): TripDetailsService {
  return {
    async findById(id) {
      return id === details.id ? details : null;
    },
    async listSeats(id) {
      return id === details.id ? seats : null;
    },
  };
}
async function startServer(t: TestContext, service = fakeService()) {
  const server = createApp([], { tripDetails: service }).listen(0, '127.0.0.1');
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return 'http://127.0.0.1:' + address.port + '/api/v1/trips';
}
test('passenger details return bilingual endpoint data, times, price and bus capacity without cache', async (t) => {
  const url = await startServer(t);
  const response = await fetch(url + '/' + details.id + '/details');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: details });
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('passenger seats return scoped identifiers, ordered seat numbers and current availability', async (t) => {
  const url = await startServer(t);
  const response = await fetch(url + '/' + details.id + '/seats');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: seats });
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('passenger reads reject invalid ids and unsupported query parameters before querying', async (t) => {
  let calls = 0;
  const url = await startServer(t, {
    async findById() {
      calls++;
      return null;
    },
    async listSeats() {
      calls++;
      return null;
    },
  });
  for (const suffix of ['details', 'seats'])
    for (const path of [
      '/bad/' + suffix,
      '/' + details.id + '/' + suffix + '?limit=1',
      '/' + details.id + '/' + suffix + '?status=CANCELLED',
    ]) {
      const response = await fetch(url + path);
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
  assert.equal(calls, 0);
});
test('missing or unavailable passenger trips return the same non-cacheable 404 on both endpoints', async (t) => {
  const url = await startServer(t);
  for (const suffix of ['details', 'seats']) {
    const response = await fetch(url + '/' + randomUUID() + '/' + suffix);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: { code: 'TRIP_NOT_FOUND', message: 'Trip not found' },
    });
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});
test('passenger database failures are forwarded as safe non-cacheable JSON errors', async (t) => {
  const fail = async () => {
    throw Error('private database details');
  };
  const url = await startServer(t, { findById: fail, listSeats: fail });
  for (const suffix of ['details', 'seats']) {
    const response = await fetch(url + '/' + details.id + '/' + suffix);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});
