import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import { createApp } from '../src/app.ts';
import {
  sessionService,
  type SessionService,
} from '../src/services/sessionService.ts';
import { AppError } from '../src/errors/AppError.ts';
import {
  busLayoutSchema,
  type BusLayoutInput,
} from '../src/schemas/busLayoutSchema.ts';
import type { BusLayoutService } from '../src/services/busLayoutService.ts';
import { seatLayout } from '../src/utils/seatLayout.ts';
import { layoutForSeats } from './helpers/layoutFixture.ts';
const busId = randomUUID(),
  seats = Array.from({ length: 4 }, (_, index) => ({
    id: randomUUID(),
    number: index + 1,
  })),
  input = layoutForSeats(seats);
const headers = {
  Authorization: 'Bearer ADMIN',
  'Content-Type': 'application/json',
};
const sessions: SessionService = {
  ...sessionService,
  async authenticateAccessToken(token) {
    if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(token))
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    return {
      sessionId: randomUUID(),
      user: {
        id: randomUUID(),
        name: 'Test',
        email: 'test@example.test',
        phone: '+201012345678',
        role: token as 'USER' | 'ADMIN' | 'SUPER_ADMIN',
        language: 'ar',
        emailVerifiedAt: '2026-01-01T00:00:00Z',
        createdAt: '2026-01-01T00:00:00Z',
      },
    };
  },
};
function view(value: BusLayoutInput) {
  return seatLayout({
    id: busId,
    ...value,
    cells: value.cells.map((cell) => ({
      ...cell,
      seat: seats.find((seat) => seat.id === cell.seatId) ?? null,
    })),
  });
}
function fake(): BusLayoutService {
  let current: ReturnType<typeof seatLayout> = null;
  return {
    async findByBusId(id) {
      if (id !== busId)
        throw new AppError(404, 'BUS_NOT_FOUND', 'Bus not found');
      return current;
    },
    async replace(_id, value) {
      current = view(value);
      return current;
    },
    async remove() {
      current = null;
    },
  };
}
async function start(t: TestContext, service = fake()) {
  const server = createApp([], { sessions, busLayouts: service }).listen(
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
  return 'http://127.0.0.1:' + address.port + '/api/v1/buses/';
}

test('admin can read, replace and remove a complete physical map without supplying new seat numbers', async (t) => {
  const base = await start(t),
    url = base + busId + '/layout';
  assert.deepEqual(await (await fetch(url, { headers })).json(), {
    data: null,
  });
  const replaced = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ ...input, cells: [...input.cells].reverse() }),
  });
  assert.equal(replaced.status, 200);
  assert.equal(replaced.headers.get('cache-control'), 'no-store');
  const layout = (await replaced.json()).data;
  assert.equal(layout.front, 'TOP');
  assert.equal(layout.columnDirection, 'VEHICLE_LEFT_TO_RIGHT');
  assert.equal(layout.cells[0].kind, 'DRIVER');
  assert.deepEqual(
    layout.cells
      .filter((cell: { kind: string }) => cell.kind === 'SEAT')
      .map((cell: { seat: { id: string; number: number } }) => cell.seat),
    seats,
  );
  assert.deepEqual((await (await fetch(url, { headers })).json()).data, layout);
  assert.equal((await fetch(url, { method: 'DELETE', headers })).status, 204);
  assert.deepEqual(await (await fetch(url, { headers })).json(), {
    data: null,
  });
});
test('layout validation rejects incomplete grids, collisions, bad cabin/doors and inconsistent seat references', async (t) => {
  const service = fake();
  let calls = 0;
  service.replace = async () => {
    calls++;
    return null;
  };
  const url = (await start(t, service)) + busId + '/layout';
  const mutate = (index: number, change: object) => ({
    ...input,
    cells: input.cells.map((cell, i) =>
      i === index ? { ...cell, ...change } : cell,
    ),
  });
  const invalid = [
    { ...input, rowCount: 1 },
    { ...input, columnCount: 9 },
    { ...input, rowCount: '2' },
    { ...input, cells: input.cells.slice(1) },
    mutate(1, { row: 0, column: 0 }),
    mutate(1, { column: 5 }),
    mutate(1, { kind: 'SEAT', seatId: randomUUID() }),
    mutate(5, { seatId: seats[1]!.id }),
    mutate(5, { seatId: null }),
    mutate(1, { seatId: randomUUID() }),
    mutate(0, { kind: 'EMPTY' }),
    mutate(1, { kind: 'DRIVER' }),
    mutate(4, { kind: 'EMPTY' }),
    mutate(1, { kind: 'DOOR' }),
    {
      ...input,
      cells: input.cells.map((cell) =>
        cell.kind === 'AISLE' ? { ...cell, kind: 'EMPTY' } : cell,
      ),
    },
    { ...input, id: randomUUID() },
    mutate(5, { number: 99 }),
    mutate(5, { isAvailable: true }),
  ];
  for (const body of invalid)
    assert.equal(
      (await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) }))
        .status,
      400,
    );
  assert.equal(calls, 0);
});
test('all layout operations require administrator roles including HEAD and cannot be authorized by a cookie', async (t) => {
  const url = (await start(t)) + busId + '/layout';
  for (const method of ['GET', 'HEAD', 'PUT', 'DELETE'])
    for (const token of ['', 'USER']) {
      const response = await fetch(url, {
        method,
        headers: token
          ? { Authorization: 'Bearer ' + token }
          : { Cookie: 'role=SUPER_ADMIN' },
      });
      assert.equal(response.status, token ? 403 : 401);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
  assert.equal(
    (await fetch(url, { headers: { Authorization: 'Bearer SUPER_ADMIN' } }))
      .status,
    200,
  );
});
test('layout endpoints reject invalid UUIDs, queries, wrong media and partial updates', async (t) => {
  const base = await start(t);
  assert.equal((await fetch(base + 'invalid/layout', { headers })).status, 400);
  for (const method of ['GET', 'PUT', 'DELETE'])
    assert.equal(
      (
        await fetch(base + busId + '/layout?userId=x', {
          method,
          headers,
          ...(method === 'PUT' ? { body: JSON.stringify(input) } : {}),
        })
      ).status,
      400,
    );
  assert.equal(
    (
      await fetch(base + busId + '/layout', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ADMIN',
          'Content-Type': 'text/plain',
        },
        body: 'text',
      })
    ).status,
    415,
  );
  assert.equal(
    (
      await fetch(base + busId + '/layout', {
        method: 'PATCH',
        headers,
        body: '{}',
      })
    ).status,
    404,
  );
  assert.equal(
    (await fetch(base + randomUUID() + '/layout', { headers })).status,
    404,
  );
});
test('layout conflicts retain safe error codes and unexpected failures do not reveal database details', async (t) => {
  const service = fake(),
    url = (await start(t, service)) + busId + '/layout';
  service.replace = async () => {
    throw new AppError(
      409,
      'LAYOUT_HAS_BOOKINGS',
      'A bus with reservations cannot change its seat layout',
    );
  };
  const conflict = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(input),
  });
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).error.code, 'LAYOUT_HAS_BOOKINGS');
  service.findByBusId = async () => {
    throw Error('private SQL connection password');
  };
  const failure = await fetch(url, { headers });
  assert.equal(failure.status, 500);
  assert.doesNotMatch(await failure.text(), /private|SQL|password/);
});
test('map schema supports 2+1 seating, a full rear bench, side doors and a right-side driver', () => {
  const ids = Array.from({ length: 6 }, () => randomUUID());
  const twoPlusOne: BusLayoutInput = {
    rowCount: 3,
    columnCount: 4,
    cells: Array.from({ length: 12 }, (_, index) => {
      const row = Math.floor(index / 4),
        column = index % 4;
      if (row === 0)
        return {
          row,
          column,
          kind: column === 0 ? 'DOOR' : column === 3 ? 'DRIVER' : 'EMPTY',
          seatId: null,
        };
      if (column === 1) return { row, column, kind: 'AISLE', seatId: null };
      return {
        row,
        column,
        kind: 'SEAT',
        seatId: ids[(row - 1) * 3 + [0, 2, 3].indexOf(column)]!,
      };
    }),
  };
  assert.equal(busLayoutSchema.safeParse(twoPlusOne).success, true);
  const rear = layoutForSeats(
    Array.from({ length: 8 }, (_, index) => ({
      id: randomUUID(),
      number: index + 1,
    })),
  );
  rear.cells = rear.cells.map((cell) =>
    cell.row === 2 && cell.column === 2
      ? { ...cell, kind: 'SEAT', seatId: randomUUID() }
      : cell,
  );
  assert.equal(busLayoutSchema.safeParse(rear).success, true);
  assert.equal(
    busLayoutSchema.safeParse({
      ...input,
      cells: input.cells.map((cell) => {
        const { seatId, ...rest } = cell;
        return cell.kind === 'SEAT' ? { ...rest, seatId } : rest;
      }),
    }).success,
    true,
  );
});
