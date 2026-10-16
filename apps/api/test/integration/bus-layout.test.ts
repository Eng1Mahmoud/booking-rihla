import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { hash } from 'argon2';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';
import { busService } from '../../src/services/busService.ts';
import { busLayoutService } from '../../src/services/busLayoutService.ts';
import { bookingService } from '../../src/services/bookingService.ts';
import { sessionService } from '../../src/services/sessionService.ts';
import { tripService } from '../../src/services/tripService.ts';
import { seedDemo } from '../../src/scripts/demoSeed.ts';
import { buildDemoData } from '../../src/scripts/demoData.ts';
import { layoutForSeats } from '../helpers/layoutFixture.ts';
import type {
  BusLayoutInput,
  LayoutCellKind,
} from '../../src/schemas/busLayoutSchema.ts';
import { AppError } from '../../src/errors/AppError.ts';
import {
  isUniqueViolation,
  isCheckViolation,
  isForeignKeyViolation,
  isRestrictViolation,
} from '../../src/utils/databaseErrors.ts';

test('physical seat layouts preserve identities, expose per-trip occupancy and reject stale or conflicting reservations in PostgreSQL', async (t) => {
  const namespace = 'layout-' + randomUUID(),
    data = buildDemoData('2099-01-01', namespace),
    users: string[] = [],
    extraBuses: string[] = [],
    extraTrips: string[] = [];
  const server = createApp([]).listen(0, '127.0.0.1');
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      for (const tripId of [
        ...data.trips.map((trip) => trip.id),
        ...extraTrips,
      ])
        await db.orm.public.Booking.where({ tripId }).deleteAll();
      for (const id of users) await db.orm.public.User.where({ id }).delete();
      for (const id of [...data.trips.map((trip) => trip.id), ...extraTrips])
        await db.orm.public.Trip.where({ id }).delete();
      for (const route of data.routes)
        await db.orm.public.Route.where({ id: route.id }).delete();
      for (const id of [...data.buses.map((bus) => bus.id), ...extraBuses]) {
        await db.orm.public.BusLayout.where({ busId: id }).deleteAll();
        await db.orm.public.Bus.where({ id }).delete();
      }
      for (const station of data.stations)
        await db.orm.public.Station.where({ id: station.id }).delete();
      for (const city of data.cities)
        await db.orm.public.City.where({ id: city.id }).delete();
    } finally {
      await db.close();
    }
  });
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = 'http://127.0.0.1:' + address.port + '/api/v1';
  await seedDemo('2099-01-01', namespace);
  const password = 'Layout-test-password-2026',
    passwordHash = await hash(password);
  async function actor(role: 'ADMIN' | 'USER') {
    const user = await db.orm.public.User.create({
      name: 'Layout test',
      email: 'layout-' + randomUUID() + '@example.test',
      passwordHash,
      phone: '+201012345678',
      role,
      emailVerifiedAt: new Date().toISOString(),
    });
    users.push(user.id);
    const response = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' },
      body: JSON.stringify({ email: user.email, password }),
    });
    assert.equal(response.status, 200);
    const token = (await response.json()).data.accessToken as string;
    return { token, auth: await sessionService.authenticateAccessToken(token) };
  }
  const admin = await actor('ADMIN'),
    passenger = await actor('USER'),
    headers = {
      Authorization: 'Bearer ' + admin.token,
      'Content-Type': 'application/json',
    };
  const request = (busId: string, method = 'GET', body?: object) =>
    fetch(base + '/buses/' + busId + '/layout', {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  async function error(response: Response, status: number, code: string) {
    assert.equal(response.status, status);
    assert.equal((await response.json()).error.code, code);
  }
  async function rejected(promise: Promise<unknown>, code: string) {
    await assert.rejects(
      promise,
      (error) => error instanceof AppError && error.code === code,
    );
  }
  const storedSeats = (busId: string) =>
    db.orm.public.BusSeat.where({ busId })
      .orderBy((seat) => seat.number.asc())
      .all();
  const swap = (input: BusLayoutInput): BusLayoutInput => {
    const placed = input.cells.filter((cell) => cell.kind === 'SEAT');
    return {
      ...input,
      cells: input.cells.map((cell) => ({
        ...cell,
        seatId:
          cell.seatId === placed[0]!.seatId
            ? placed[1]!.seatId
            : cell.seatId === placed[1]!.seatId
              ? placed[0]!.seatId
              : cell.seatId,
      })),
    };
  };
  const small = await busService.create({
    plateNumber: 'LAYOUT-' + randomUUID().slice(0, 16).toUpperCase(),
    seatCount: 4,
    isActive: true,
  });
  extraBuses.push(small.id);
  const originalSeats = await storedSeats(small.id),
    map = layoutForSeats(originalSeats);
  assert.deepEqual(await (await request(small.id)).json(), { data: null });
  const set = await request(small.id, 'PUT', map);
  assert.equal(set.status, 200);
  const initial = (await set.json()).data;
  assert.equal(initial.rowCount, 2);
  assert.equal(initial.columnCount, 5);
  assert.equal(initial.front, 'TOP');
  assert.equal(initial.cells[0].kind, 'DRIVER');
  assert.deepEqual(await storedSeats(small.id), originalSeats);
  assert.deepEqual(
    initial.cells
      .filter((cell: { kind: string }) => cell.kind === 'SEAT')
      .map((cell: { seat: { id: string; number: number } }) => cell.seat),
    originalSeats.map(({ id, number }) => ({ id, number })),
  );
  const same = await request(small.id, 'PUT', {
    ...map,
    cells: [...map.cells].reverse(),
  });
  assert.equal((await same.json()).data.id, initial.id);
  await rejected(
    busService.update(small.id, { seatCount: 5 }),
    'BUS_HAS_LAYOUT',
  );
  const foreignSeat = data.seats[0]!;
  await error(
    await request(small.id, 'PUT', {
      ...map,
      cells: map.cells.map((cell) =>
        cell.seatId === originalSeats[0]!.id
          ? { ...cell, seatId: foreignSeat.id }
          : cell,
      ),
    }),
    400,
    'INVALID_LAYOUT_SEATS',
  );
  await error(
    await request(small.id, 'PUT', {
      ...map,
      cells: map.cells.map((cell) =>
        cell.seatId === originalSeats[0]!.id
          ? { ...cell, kind: 'EMPTY', seatId: null }
          : cell,
      ),
    }),
    400,
    'INVALID_LAYOUT_SEATS',
  );
  assert.deepEqual(await busLayoutService.findByBusId(small.id), initial);
  const parent = await db.orm.public.BusLayout.where({
    busId: small.id,
  }).first();
  assert.ok(parent);
  await assert.rejects(
    db.orm.public.BusLayoutCell.create({
      layoutId: parent.id,
      row: 0,
      column: 0,
      kind: 'EMPTY',
    }),
    (error) =>
      isUniqueViolation(error, 'BusLayoutCell_layoutId_row_column_key'),
  );
  await assert.rejects(
    db.orm.public.BusLayoutCell.create({
      layoutId: parent.id,
      row: 20,
      column: 0,
      kind: 'SEAT',
      seatId: originalSeats[0]!.id,
    }),
    (error) => isUniqueViolation(error, 'BusLayoutCell_seatId_key'),
  );
  await assert.rejects(
    db.orm.public.BusLayoutCell.create({
      layoutId: parent.id,
      row: 20,
      column: 0,
      kind: 'SEAT',
    }),
    (error) => isCheckViolation(error, 'bus_layout_cell_seat_5946a95f'),
  );
  await assert.rejects(
    db.orm.public.BusLayoutCell.create({
      layoutId: parent.id,
      row: 51,
      column: 0,
      kind: 'EMPTY',
    }),
    (error) => isCheckViolation(error, 'bus_layout_cell_coordinates_163905df'),
  );
  await assert.rejects(
    db.orm.public.BusLayout.where({ id: parent.id }).update({ rowCount: 1 }),
    (error) => isCheckViolation(error, 'bus_layout_dimensions_e07be16e'),
  );
  await assert.rejects(
    db.orm.public.BusSeat.where({ id: originalSeats[0]!.id }).delete(),
    (error) => isForeignKeyViolation(error) || isRestrictViolation(error),
  );
  // Force a later cell-write failure to prove the old header/cells roll back together.
  const cellsBefore = await db.orm.public.BusLayoutCell.where({
    layoutId: parent.id,
  })
    .orderBy((cell) => cell.id.asc())
    .all();
  await assert.rejects(
    busLayoutService.replace(small.id, {
      ...map,
      cells: map.cells.map((cell) =>
        cell.kind === 'EMPTY'
          ? { ...cell, kind: 'INVALID' as LayoutCellKind }
          : cell,
      ),
    }),
  );
  assert.deepEqual(await busLayoutService.findByBusId(small.id), initial);
  assert.deepEqual(
    await db.orm.public.BusLayoutCell.where({ layoutId: parent.id })
      .orderBy((cell) => cell.id.asc())
      .all(),
    cellsBefore,
  );
  await Promise.all([
    busLayoutService.replace(small.id, map),
    busLayoutService.replace(small.id, swap(map)),
  ]);
  const parallel = await busLayoutService.findByBusId(small.id);
  assert.ok(parallel);
  const positions = parallel.cells
    .filter((cell) => cell.seat)
    .map((cell) => cell.seat!.id);
  const originalOrder = originalSeats.map((seat) => seat.id),
    swappedOrder = [
      originalOrder[1],
      originalOrder[0],
      ...originalOrder.slice(2),
    ];
  assert.ok(
    JSON.stringify(positions) === JSON.stringify(originalOrder) ||
      JSON.stringify(positions) === JSON.stringify(swappedOrder),
  );
  assert.notEqual(parallel.id, initial.id);
  assert.deepEqual(await storedSeats(small.id), originalSeats);
  assert.equal((await request(small.id, 'DELETE')).status, 204);
  assert.equal((await request(small.id, 'DELETE')).status, 204);
  assert.deepEqual(await storedSeats(small.id), originalSeats);
  const resized = await busService.update(small.id, { seatCount: 5 });
  assert.equal(resized?.seatCount, 5);
  const resizedSeats = await storedSeats(small.id);
  assert.deepEqual(resizedSeats.slice(0, 4), originalSeats);
  await busLayoutService.replace(small.id, layoutForSeats(resizedSeats));
  const disposable = await busService.create({
    plateNumber: 'REMOVE-' + randomUUID().slice(0, 16).toUpperCase(),
    seatCount: 2,
    isActive: true,
  });
  extraBuses.push(disposable.id);
  await busLayoutService.replace(
    disposable.id,
    layoutForSeats(await storedSeats(disposable.id)),
  );
  assert.ok(await busService.remove(disposable.id));
  assert.equal(
    await db.orm.public.BusLayout.where({ busId: disposable.id }).first(),
    null,
  );
  assert.deepEqual(await storedSeats(disposable.id), []);
  // Public maps use the assigned bus and add occupancy in the same query snapshot.
  const trip = data.trips[0]!,
    later = data.trips[3]!,
    other = data.trips[1]!,
    tripSeats = await storedSeats(trip.busId),
    tripMap = layoutForSeats(tripSeats);
  const oldMap = await busLayoutService.replace(trip.busId, tripMap);
  assert.ok(oldMap);
  const currentMap = await busLayoutService.replace(trip.busId, swap(tripMap));
  assert.ok(currentMap);
  assert.notEqual(oldMap.id, currentMap.id);
  async function publicSeats(id: string, language = 'en') {
    const response = await fetch(base + '/trips/' + id + '/seats', {
      headers: { 'Accept-Language': language },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    return (await response.json()).data;
  }
  const publicBefore = await publicSeats(trip.id);
  assert.equal(publicBefore.layout.id, currentMap.id);
  assert.deepEqual(await publicSeats(trip.id, 'ar'), publicBefore);
  assert.equal(publicBefore.layout.cells[0].kind, 'DRIVER');
  assert.equal('plateNumber' in publicBefore, false);
  assert.ok(!JSON.stringify(publicBefore).includes('passengerName'));
  const bookingInput = {
    tripId: trip.id,
    contactPhone: '+201012345678',
    passengers: [{ seatId: tripSeats[0]!.id, name: 'Reserved passenger' }],
  };
  await rejected(
    bookingService.create(passenger.auth, bookingInput),
    'SEAT_LAYOUT_CHANGED',
  );
  await rejected(
    bookingService.create(passenger.auth, {
      ...bookingInput,
      layoutId: oldMap.id,
    }),
    'SEAT_LAYOUT_CHANGED',
  );
  assert.equal(
    (await db.orm.public.Booking.where({ tripId: trip.id }).all()).length,
    0,
  );
  await error(
    await fetch(base + '/bookings', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + passenger.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...bookingInput, layoutId: oldMap.id }),
    }),
    409,
    'SEAT_LAYOUT_CHANGED',
  );
  const create = await fetch(base + '/bookings', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + passenger.token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...bookingInput, layoutId: currentMap.id }),
  });
  assert.equal(create.status, 201);
  const booked = (await create.json()).data;
  assert.equal(booked.passengers[0].seatId, tripSeats[0]!.id);
  assert.equal(booked.passengers[0].seatNumber, 1);
  const occupied = await publicSeats(trip.id);
  assert.equal(
    occupied.layout.cells.find(
      (cell: { seat: { id: string } | null }) =>
        cell.seat?.id === tripSeats[0]!.id,
    ).seat.isAvailable,
    false,
  );
  assert.equal(occupied.availableSeats, 19);
  assert.ok(
    (await publicSeats(later.id)).layout.cells.find(
      (cell: { seat: { id: string } | null }) =>
        cell.seat?.id === tripSeats[0]!.id,
    ).seat.isAvailable,
  );
  await error(
    await request(trip.busId, 'PUT', tripMap),
    409,
    'LAYOUT_HAS_BOOKINGS',
  );
  await error(await request(trip.busId, 'DELETE'), 409, 'LAYOUT_HAS_BOOKINGS');
  const beforeNoop = await db.orm.public.BusLayoutCell.where({
    layoutId: currentMap.id,
  })
    .orderBy((cell) => cell.id.asc())
    .all();
  assert.equal(
    (
      await request(trip.busId, 'PUT', {
        ...swap(tripMap),
        cells: [...swap(tripMap).cells].reverse(),
      })
    ).status,
    200,
  );
  assert.deepEqual(
    await db.orm.public.BusLayoutCell.where({ layoutId: currentMap.id })
      .orderBy((cell) => cell.id.asc())
      .all(),
    beforeNoop,
  );
  await rejected(busService.remove(trip.busId), 'BUS_IN_USE');
  assert.equal(
    (await busLayoutService.findByBusId(trip.busId))?.id,
    currentMap.id,
  );
  // Stale layout ids are invalid after removal and recreation, even for the same positions.
  const otherSeats = await storedSeats(other.busId),
    otherMap = layoutForSeats(otherSeats);
  const removed = await busLayoutService.replace(other.busId, otherMap);
  assert.ok(removed);
  await busLayoutService.remove(other.busId);
  const otherInput = {
    tripId: other.id,
    contactPhone: '+201012345678',
    passengers: [{ seatId: otherSeats[0]!.id, name: 'Other' }],
  };
  await rejected(
    bookingService.create(passenger.auth, {
      ...otherInput,
      layoutId: removed.id,
    }),
    'SEAT_LAYOUT_CHANGED',
  );
  const fresh = await busLayoutService.replace(other.busId, otherMap);
  assert.ok(fresh);
  assert.notEqual(fresh.id, removed.id);
  const race = await Promise.allSettled([
    bookingService.create(passenger.auth, {
      ...otherInput,
      layoutId: fresh.id,
    }),
    busLayoutService.replace(other.busId, swap(otherMap)),
  ]);
  assert.equal(race.filter((item) => item.status === 'fulfilled').length, 1);
  assert.ok(
    race
      .filter((item) => item.status === 'rejected')
      .every(
        (item) =>
          item.status === 'rejected' &&
          item.reason instanceof AppError &&
          ['LAYOUT_HAS_BOOKINGS', 'SEAT_LAYOUT_CHANGED'].includes(
            item.reason.code,
          ),
      ),
  );
  // Removal versus the first reservation also has one winner, without losing seats.
  const extra = await tripService.create({
    routeId: trip.routeId,
    busId: small.id,
    departureAt: '2099-01-10T08:00:00Z',
    arrivalAt: '2099-01-10T11:00:00Z',
    pricePiastres: 25000,
    status: 'SCHEDULED',
  });
  extraTrips.push(extra.id);
  const extraLayout = await busLayoutService.findByBusId(small.id);
  assert.ok(extraLayout);
  const deletionRace = await Promise.allSettled([
    bookingService.create(passenger.auth, {
      tripId: extra.id,
      layoutId: extraLayout.id,
      contactPhone: '+201012345678',
      passengers: [{ seatId: resizedSeats[0]!.id, name: 'Extra' }],
    }),
    busLayoutService.remove(small.id),
  ]);
  assert.equal(
    deletionRace.filter((item) => item.status === 'fulfilled').length,
    1,
  );
  assert.ok(
    deletionRace
      .filter((item) => item.status === 'rejected')
      .every(
        (item) =>
          item.status === 'rejected' &&
          item.reason instanceof AppError &&
          ['LAYOUT_HAS_BOOKINGS', 'SEAT_LAYOUT_CHANGED'].includes(
            item.reason.code,
          ),
      ),
  );
  assert.deepEqual(await storedSeats(small.id), resizedSeats);
  // Existing unconfigured buses keep numbered-seat booking; do not invent their geometry.
  const plain = data.trips[2]!,
    plainSeats = await storedSeats(plain.busId);
  assert.equal((await publicSeats(plain.id)).layout, null);
  await bookingService.create(passenger.auth, {
    tripId: plain.id,
    contactPhone: '+201012345678',
    passengers: [{ seatId: plainSeats[0]!.id, name: 'Legacy' }],
  });
  await rejected(
    busLayoutService.replace(plain.busId, layoutForSeats(plainSeats)),
    'LAYOUT_HAS_BOOKINGS',
  );
});
