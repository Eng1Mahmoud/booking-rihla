import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';
import {
  callbackFixture,
  signCallback,
  webhookEnvironment,
} from '../helpers/paymobFixture.ts';

test('signed Paymob receipts survive concurrent delivery without confirming or changing bookings', async (t) => {
  const old = Object.fromEntries(
    Object.keys(webhookEnvironment).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, webhookEnvironment);
  const body = {
    ...callbackFixture,
    obj: {
      ...callbackFixture.obj,
      id: randomInt(10000000, 20000000),
      order: { id: randomInt(20000000, 30000000) },
    },
  };
  const orderId = String(body.obj.order.id);
  const server = createApp([]).listen(0, '127.0.0.1');
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
      await db.orm.public.PaymentEvent.where({ orderId }).deleteAll();
    } finally {
      for (const [key, value] of Object.entries(old)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      await db.close();
    }
  });
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base =
    'http://127.0.0.1:' + address.port + '/api/v1/payments/paymob/webhook';
  const bookingsBefore = await db.orm.public.Booking.all();
  const seatsBefore = await db.orm.public.BookingSeat.all();
  async function send(event = body, signature = signCallback(event)) {
    return fetch(base + '?hmac=' + signature, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...event,
        obj: {
          ...event.obj,
          is_live: false,
          captured_amount: 100,
          customer: { email: 'private@example.test' },
        },
      }),
    });
  }
  const responses = await Promise.all(Array.from({ length: 12 }, () => send()));
  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { received: true });
  }
  let events = await db.orm.public.PaymentEvent.where({ orderId }).all();
  assert.equal(events.length, 1);
  const first = events[0]!;
  assert.equal(first.transactionId, String(body.obj.id));
  assert.equal(first.ownerId, '4705');
  for (const secret of [
    'private@example.test',
    'source_data',
    'pan',
    'is_live',
    'captured_amount',
    signCallback(body),
  ])
    assert.ok(!first.signedJson.includes(secret));
  const pending = {
    ...body,
    obj: { ...body.obj, pending: true, success: false },
  };
  assert.equal((await send(pending)).status, 200);
  assert.equal((await send(body)).status, 200);
  events = await db.orm.public.PaymentEvent.where({ orderId }).all();
  assert.equal(events.length, 2);
  assert.equal(new Set(events.map((e) => e.eventKey)).size, 2);
  assert.equal((await send(body, '0'.repeat(128))).status, 401);
  const otherIntegration = { ...body, obj: { ...body.obj, integration_id: 1 } };
  assert.equal((await send(otherIntegration)).status, 403);
  process.env['PAYMOB_OWNER_ID'] = '9';
  assert.equal((await send(body)).status, 403);
  process.env['PAYMOB_OWNER_ID'] = '';
  // A redelivery after persistence has the same receipt id and timestamp.
  const retained = await db.orm.public.PaymentEvent.where({
    id: first.id,
  }).first();
  assert.deepEqual(retained, first);
  assert.equal(
    (await db.orm.public.PaymentEvent.where({ orderId }).all()).length,
    2,
  );
  assert.deepEqual(await db.orm.public.Booking.all(), bookingsBefore);
  assert.deepEqual(await db.orm.public.BookingSeat.all(), seatsBefore);
});
