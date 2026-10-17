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
import type { TicketService } from '../src/services/ticketService.ts';
import { ticketEmail } from '../src/emails/ticketEmail.ts';
import QRCode from 'qrcode';
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
  status: 'PENDING_PAYMENT' as const,
  paymentRequired: true,
  expiresAt: '2099-01-01T12:10:00.000Z',
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

const id = randomUUID();
const ticket = {
  id,
  bookingId: booking.id,
  reference: booking.reference,
  issuedAt: '2026-10-17T12:00:00.000Z',
  currency: 'EGP',
  totalPiastres: 25000,
  passengers: [{ name: '<Passenger>', seatNumber: 1 }],
  trip: {
    id: booking.trip.id,
    departureAt: '2099-01-01T08:00:00.000Z',
    arrivalAt: '2099-01-01T11:00:00.000Z',
    origin: {
      nameAr: 'رمسيس',
      nameEn: 'Ramses',
      cityAr: 'القاهرة',
      cityEn: 'Cairo',
    },
    destination: {
      nameAr: 'محرم بك',
      nameEn: 'Moharam Bek',
      cityAr: 'الإسكندرية',
      cityEn: 'Alexandria',
    },
  },
  qr: {
    payload: 'BUS-TICKET:v1:' + id,
    imageDataUrl: await QRCode.toDataURL('BUS-TICKET:v1:' + id),
  },
};
const headers = { Authorization: 'Bearer valid' };
async function start(t: TestContext, service?: TicketService) {
  const server = createApp([], {
    sessions,
    tickets: service ?? {
      async findByBooking(owner, target) {
        return owner === user.id && target === booking.id ? ticket : null;
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
  return 'http://127.0.0.1:' + address.port + '/api/v1/bookings/';
}
test('ticket route requires authentication and passes the current owner to its service', async (t) => {
  let received: unknown;
  const base = await start(t, {
    async findByBooking(owner, target) {
      received = [owner, target];
      return ticket;
    },
  });
  assert.equal((await fetch(base + booking.id + '/ticket')).status, 401);
  assert.equal(received, undefined);
  const response = await fetch(base + booking.id + '/ticket', { headers });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(received, [user.id, booking.id]);
  assert.deepEqual((await response.json()).data, ticket);
});
test('missing or unavailable ticket is an indistinguishable 404', async (t) => {
  const base = await start(t, {
    async findByBooking() {
      return null;
    },
  });
  const response = await fetch(base + randomUUID() + '/ticket', { headers });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found' },
  });
});
test('ticket rejects malformed identifiers, query parameters and mutation routes', async (t) => {
  const base = await start(t);
  for (const suffix of [
    'bad/ticket',
    booking.id + '/ticket?email=a',
    booking.id + '/ticket?download=true',
    booking.id + '/ticket?userId=' + user.id,
  ])
    assert.equal((await fetch(base + suffix, { headers })).status, 400);
  for (const method of ['POST', 'PATCH', 'DELETE'])
    assert.equal(
      (await fetch(base + booking.id + '/ticket', { method, headers })).status,
      404,
    );
});
test('ticket email uses Cairo times and exact piastre price in both languages with a PNG attachment', () => {
  for (const language of ['ar', 'en']) {
    const message = ticketEmail(ticket, language);
    assert.ok(message.subject.includes(ticket.reference));
    assert.ok(message.text.includes('250.00 EGP'));
    assert.ok(message.text.includes('<Passenger>'));
    assert.ok(
      message.text.includes(language === 'ar' ? 'القاهرة' : 'Africa/Cairo'),
    );
    assert.equal(message.attachments[0]!.contentType, 'image/png');
    assert.deepEqual(
      message.attachments[0]!.content.subarray(0, 8),
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    assert.equal('html' in message, false);
  }
});
