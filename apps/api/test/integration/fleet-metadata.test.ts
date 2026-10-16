import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { hash } from 'argon2';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';
import { buildDemoData } from '../../src/scripts/demoData.ts';
import { seedDemo } from '../../src/scripts/demoSeed.ts';
import { busService } from '../../src/services/busService.ts';
import { busTypeService } from '../../src/services/busTypeService.ts';
import { amenityService } from '../../src/services/amenityService.ts';
import { bookingService } from '../../src/services/bookingService.ts';
import { sessionService } from '../../src/services/sessionService.ts';
import { AppError } from '../../src/errors/AppError.ts';
import {
  isUniqueViolation,
  isCheckViolation,
} from '../../src/utils/databaseErrors.ts';

test('fleet metadata CRUD, atomic assignments, passenger projections and reservation safeguards work in PostgreSQL', async (t) => {
  const namespace = 'fleet-' + randomUUID(),
    data = buildDemoData('2099-01-01', namespace),
    users: string[] = [],
    types: string[] = [],
    amenities: string[] = [],
    extraBuses: string[] = [];
  const server = createApp([]).listen(0, '127.0.0.1');
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
      for (const trip of data.trips)
        await db.orm.public.Booking.where({ tripId: trip.id }).deleteAll();
      for (const userId of users)
        await db.orm.public.User.where({ id: userId }).delete();
      for (const trip of data.trips)
        await db.orm.public.Trip.where({ id: trip.id }).delete();
      for (const route of data.routes)
        await db.orm.public.Route.where({ id: route.id }).delete();
      for (const id of [...data.buses.map((bus) => bus.id), ...extraBuses])
        await db.orm.public.Bus.where({ id }).delete();
      for (const station of data.stations)
        await db.orm.public.Station.where({ id: station.id }).delete();
      for (const city of data.cities)
        await db.orm.public.City.where({ id: city.id }).delete();
      for (const id of types)
        await db.orm.public.BusType.where({ id }).delete();
      for (const id of amenities)
        await db.orm.public.Amenity.where({ id }).delete();
    } finally {
      await db.close();
    }
  });
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = 'http://127.0.0.1:' + address.port + '/api/v1';
  await seedDemo('2099-01-01', namespace);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase();
  const password = 'Fleet-metadata-password-2026',
    passwordHash = await hash(password);
  async function actor(role: 'ADMIN' | 'USER') {
    const user = await db.orm.public.User.create({
      name: 'Fleet test',
      email: 'fleet-' + randomUUID() + '@example.test',
      passwordHash,
      phone: '+201012345678',
      role,
      emailVerifiedAt: new Date().toISOString(),
    });
    users.push(user.id);
    const login = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' },
      body: JSON.stringify({ email: user.email, password }),
    });
    assert.equal(login.status, 200);
    return (await login.json()).data.accessToken as string;
  }
  const admin = await actor('ADMIN'),
    passenger = await actor('USER'),
    auth = await sessionService.authenticateAccessToken(passenger);
  const headers = {
    Authorization: 'Bearer ' + admin,
    'Content-Type': 'application/json',
  };
  const request = (path: string, method = 'GET', body?: object) =>
    fetch(base + path, {
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
  async function create(path: string, code: string) {
    const response = await request('/' + path, 'POST', {
      code: code.toLowerCase(),
      nameAr: ' مميز ',
      nameEn: ' Premium ',
    });
    assert.equal(response.status, 201);
    const item = (await response.json()).data;
    (path === 'bus-types' ? types : amenities).push(item.id);
    assert.equal(item.code, code);
    assert.equal(item.nameAr, 'مميز');
    return item;
  }
  const type = await create('bus-types', 'VIP_' + suffix),
    secondType = await create('bus-types', 'STANDARD_' + suffix);
  const wifi = await create('amenities', 'WIFI_' + suffix),
    usb = await create('amenities', 'USB_' + suffix),
    ac = await create('amenities', 'AC_' + suffix);
  for (const path of ['bus-types', 'amenities']) {
    assert.equal((await fetch(base + '/' + path)).status, 401);
    assert.equal(
      (
        await fetch(base + '/' + path, {
          headers: { Authorization: 'Bearer ' + passenger },
        })
      ).status,
      403,
    );
    assert.equal((await request('/' + path + '?limit=1&offset=0')).status, 200);
  }
  await error(
    await request('/bus-types', 'POST', {
      code: type.code.toLowerCase(),
      nameAr: 'مكرر',
      nameEn: 'Duplicate',
    }),
    409,
    'BUS_TYPE_CODE_EXISTS',
  );
  await error(
    await request('/amenities', 'POST', {
      code: wifi.code.toLowerCase(),
      nameAr: 'مكرر',
      nameEn: 'Duplicate',
    }),
    409,
    'AMENITY_CODE_EXISTS',
  );
  const races = await Promise.all(
    Array.from({ length: 2 }, () =>
      request('/amenities', 'POST', {
        code: 'RACE_' + suffix,
        nameAr: 'مميز',
        nameEn: 'Premium',
      }),
    ),
  );
  assert.deepEqual(races.map((response) => response.status).sort(), [201, 409]);
  for (const response of races) {
    const body = await response.json();
    if (response.status === 201) amenities.push(body.data.id);
    else assert.equal(body.error.code, 'AMENITY_CODE_EXISTS');
  }
  const busResponse = await request('/buses', 'POST', {
    plateNumber: 'FLEET-' + suffix,
    seatCount: 3,
    busTypeId: type.id,
    amenityIds: [wifi.id, usb.id],
  });
  assert.equal(busResponse.status, 201);
  const bus = (await busResponse.json()).data;
  extraBuses.push(bus.id);
  assert.deepEqual(bus.busType, type);
  assert.deepEqual(
    bus.amenities.map((a: { id: string }) => a.id),
    [usb.id, wifi.id],
  );
  assert.equal('amenityLinks' in bus, false);
  await error(
    await request('/bus-types/' + type.id, 'DELETE'),
    409,
    'BUS_TYPE_IN_USE',
  );
  await error(
    await request('/amenities/' + wifi.id, 'DELETE'),
    409,
    'AMENITY_IN_USE',
  );
  const conflictingBus = await busService.create({
    plateNumber: 'CONFLICT-' + suffix,
    seatCount: 1,
    isActive: true,
  });
  extraBuses.push(conflictingBus.id);
  const originalSeats = await db.orm.public.BusSeat.where({
    busId: bus.id,
  }).all();
  await error(
    await request('/buses/' + bus.id, 'PATCH', {
      seatCount: 5,
      busTypeId: null,
      amenityIds: [randomUUID()],
    }),
    404,
    'AMENITY_NOT_FOUND',
  );
  assert.equal((await busService.findById(bus.id))?.seatCount, 3);
  assert.equal((await busService.findById(bus.id))?.busTypeId, type.id);
  assert.deepEqual(
    await db.orm.public.BusSeat.where({ busId: bus.id }).all(),
    originalSeats,
  );
  await error(
    await request('/buses', 'POST', {
      plateNumber: 'ABSENT-' + suffix,
      seatCount: 2,
      busTypeId: randomUUID(),
    }),
    404,
    'BUS_TYPE_NOT_FOUND',
  );
  assert.equal(
    await db.orm.public.Bus.where({ plateNumber: 'ABSENT-' + suffix }).first(),
    null,
  );
  await error(
    await request('/buses/' + bus.id, 'PATCH', {
      plateNumber: conflictingBus.plateNumber,
      seatCount: 5,
      amenityIds: [ac.id],
    }),
    409,
    'PLATE_NUMBER_EXISTS',
  );
  assert.equal(
    (await db.orm.public.BusSeat.where({ busId: bus.id }).all()).length,
    3,
  );
  await Promise.all([
    busService.update(bus.id, { amenityIds: [wifi.id, usb.id] }),
    busService.update(bus.id, { amenityIds: [usb.id, ac.id] }),
  ]);
  const final = (await busService.findById(bus.id))!;
  const finalIds = final.amenities.map((a) => a.id).sort();
  assert.ok(
    JSON.stringify(finalIds) === JSON.stringify([wifi.id, usb.id].sort()) ||
      JSON.stringify(finalIds) === JSON.stringify([usb.id, ac.id].sort()),
  );
  await busService.update(bus.id, { isActive: false });
  assert.equal((await busService.findById(bus.id))?.busTypeId, type.id);
  const linked = await db.orm.public.BusAmenity.where({
    busId: bus.id,
  }).first();
  assert.ok(linked);
  await assert.rejects(
    db.orm.public.BusAmenity.create({
      busId: bus.id,
      amenityId: linked.amenityId,
    }),
    (error) => isUniqueViolation(error, 'BusAmenity_busId_amenityId_key'),
  );
  await busService.update(bus.id, { busTypeId: null, amenityIds: [] });
  assert.deepEqual((await busService.findById(bus.id))?.amenities, []);
  assert.equal((await busService.findById(bus.id))?.busType, null);
  const filter = await request('/buses?busTypeId=' + type.id);
  assert.ok(
    (await filter.json()).data.every(
      (row: { busTypeId: string }) => row.busTypeId === type.id,
    ),
  );
  const metadata = await request('/amenities/' + ac.id, 'PATCH', {
    nameEn: 'Air conditioning',
  });
  assert.equal(metadata.status, 200);
  assert.equal((await metadata.json()).data.code, ac.code);
  await assert.rejects(
    db.orm.public.Amenity.where({ id: ac.id }).update({ code: 'invalid-code' }),
    (error) => isCheckViolation(error, 'amenity_code_2073f902'),
  );
  const trip = data.trips[0]!,
    busId = trip.busId;
  await busService.update(busId, {
    busTypeId: type.id,
    amenityIds: [wifi.id, usb.id],
  });
  const details = await fetch(base + '/trips/' + trip.id + '/details');
  assert.equal(details.status, 200);
  const publicBus = (await details.json()).data.bus;
  assert.deepEqual(publicBus.busType, type);
  assert.deepEqual(
    publicBus.amenities.map((a: { id: string }) => a.id),
    [usb.id, wifi.id],
  );
  assert.equal('plateNumber' in publicBus, false);
  assert.equal('amenityLinks' in publicBus, false);
  const route = data.routes.find((route) => route.id === trip.routeId)!;
  const search = await fetch(
    base +
      '/trips/search?originStationId=' +
      route.originStationId +
      '&destinationStationId=' +
      route.destinationStationId +
      '&travelDate=2099-01-01',
  );
  assert.equal(search.status, 200);
  assert.deepEqual(
    (await search.json()).data.find((row: { id: string }) => row.id === trip.id)
      .bus,
    publicBus,
  );
  const plain = await fetch(base + '/trips/' + data.trips[1]!.id + '/details');
  const plainBus = (await plain.json()).data.bus;
  assert.equal(plainBus.busType, null);
  assert.deepEqual(plainBus.amenities, []);
  const seat = data.seats.find((seat) => seat.busId === busId)!;
  await bookingService.create(auth, {
    tripId: trip.id,
    contactPhone: '+201012345678',
    passengers: [{ seatId: seat.id, name: 'Passenger' }],
  });
  await rejected(
    busService.update(busId, { busTypeId: secondType.id }),
    'BUS_HAS_BOOKINGS',
  );
  await rejected(
    busService.update(busId, { amenityIds: [] }),
    'BUS_HAS_BOOKINGS',
  );
  await rejected(
    busTypeService.update(type.id, { nameEn: 'Different class' }),
    'BUS_TYPE_HAS_BOOKINGS',
  );
  await rejected(
    amenityService.update(wifi.id, { nameEn: 'Different amenity' }),
    'AMENITY_HAS_BOOKINGS',
  );
  assert.ok(
    await busService.update(busId, {
      busTypeId: type.id,
      amenityIds: [usb.id, wifi.id],
    }),
  );
  assert.ok(await busTypeService.update(type.id, { nameEn: type.nameEn }));
  // Catalog edits and first bookings serialize using the same catalog row locks.
  const later = data.trips[1]!,
    laterSeat = data.seats.find((seat) => seat.busId === later.busId)!;
  await busService.update(later.busId, {
    busTypeId: secondType.id,
    amenityIds: [ac.id],
  });
  const concurrent = await Promise.allSettled([
    bookingService.create(auth, {
      tripId: later.id,
      contactPhone: '+201012345678',
      passengers: [{ seatId: laterSeat.id, name: 'Other' }],
    }),
    busTypeService.update(secondType.id, { nameEn: 'Updated before booking' }),
    amenityService.update(ac.id, { nameEn: 'Updated amenity' }),
  ]);
  assert.equal(concurrent[0]!.status, 'fulfilled');
  for (const [index, code] of [
    [1, 'BUS_TYPE_HAS_BOOKINGS'],
    [2, 'AMENITY_HAS_BOOKINGS'],
  ] as const) {
    const item = concurrent[index]!;
    if (item.status === 'rejected')
      assert.ok(item.reason instanceof AppError && item.reason.code === code);
  }
  const third = data.trips[2]!,
    thirdSeat = data.seats.find((seat) => seat.busId === third.busId)!;
  await busService.update(third.busId, {
    busTypeId: type.id,
    amenityIds: [wifi.id],
  });
  const assignmentRace = await Promise.allSettled([
    bookingService.create(auth, {
      tripId: third.id,
      contactPhone: '+201012345678',
      passengers: [{ seatId: thirdSeat.id, name: 'Third' }],
    }),
    busService.update(third.busId, { busTypeId: null, amenityIds: [] }),
  ]);
  assert.equal(assignmentRace[0]!.status, 'fulfilled');
  if (assignmentRace[1]!.status === 'rejected')
    assert.ok(
      assignmentRace[1]!.reason instanceof AppError &&
        assignmentRace[1]!.reason.code === 'BUS_HAS_BOOKINGS',
    );
  const unused = await create('bus-types', 'UNUSED_' + suffix);
  assert.equal(
    (await request('/bus-types/' + unused.id, 'DELETE')).status,
    204,
  );
  assert.equal((await request('/bus-types/' + unused.id)).status, 404);
});
