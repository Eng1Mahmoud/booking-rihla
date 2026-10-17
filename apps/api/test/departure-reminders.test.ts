import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  departureReminderState,
  reminderLeadMs,
} from '../src/services/departureReminderService.ts';
import { departureReminderEmail } from '../src/emails/departureReminderEmail.ts';
import type { TicketDetails } from '../src/services/ticketService.ts';
const departure = Date.parse('2099-01-01T12:00:00Z');
const issued = new Date(departure - 2 * reminderLeadMs).toISOString();
test('reminder uses inclusive 24-hour threshold and excludes departure itself', () => {
  const date = new Date(departure).toISOString();
  assert.equal(
    departureReminderState(issued, date, departure - reminderLeadMs - 1),
    'WAITING',
  );
  assert.equal(
    departureReminderState(issued, date, departure - reminderLeadMs),
    'DUE',
  );
  assert.equal(departureReminderState(issued, date, departure - 1), 'DUE');
  assert.equal(departureReminderState(issued, date, departure), 'SKIP');
  assert.equal(departureReminderState(issued, date, departure + 1), 'SKIP');
});
test('recently issued tickets skip the reminder but exact 24-hour issuance is eligible', () => {
  const date = new Date(departure).toISOString();
  assert.equal(
    departureReminderState(
      new Date(departure - reminderLeadMs).toISOString(),
      date,
      departure - 1,
    ),
    'DUE',
  );
  assert.equal(
    departureReminderState(
      new Date(departure - reminderLeadMs + 1).toISOString(),
      date,
      departure - 1,
    ),
    'SKIP',
  );
});
test('reminder measures elapsed time across an offset change rather than local calendar days', () => {
  const date = '2026-10-30T10:00:00+02:00';
  const old = '2026-10-28T10:00:00+03:00';
  assert.equal(
    departureReminderState(old, date, Date.parse('2026-10-29T10:00:00+03:00')),
    'WAITING',
  );
  assert.equal(
    departureReminderState(old, date, Date.parse('2026-10-29T11:00:00+03:00')),
    'DUE',
  );
  for (const input of [
    ['bad', date, departure],
    [old, 'bad', departure],
    [old, date, NaN],
  ] as const)
    assert.throws(
      () => departureReminderState(input[0], input[1], input[2]),
      /Invalid reminder timestamp/,
    );
});
test('Arabic and English reminders contain journey details in plain text without billing or QR attachments', () => {
  const ticket: TicketDetails = {
    id: 'test-ticket',
    bookingId: 'test-booking',
    reference: 'BUS-1234567890ABCDEF',
    issuedAt: issued,
    currency: 'EGP',
    totalPiastres: 25000,
    passengers: [{ seatNumber: 7, name: '<Passenger>' }],
    trip: {
      id: 'test-trip',
      departureAt: '2099-01-01T12:00:00Z',
      arrivalAt: '2099-01-01T15:00:00Z',
      origin: {
        cityAr: 'القاهرة',
        cityEn: 'Cairo',
        nameAr: 'رمسيس',
        nameEn: 'Ramses',
      },
      destination: {
        cityAr: 'الإسكندرية',
        cityEn: 'Alexandria',
        nameAr: 'محرم بك',
        nameEn: 'Moharam Bek',
      },
    },
  };
  for (const language of ['ar', 'en']) {
    const message = departureReminderEmail(ticket, language);
    assert.ok(message.subject.includes(ticket.reference));
    assert.ok(message.text.includes('<Passenger>'));
    assert.ok(message.text.includes(language === 'ar' ? 'المقعد 7' : 'Seat 7'));
    assert.ok(
      message.text.includes(language === 'ar' ? 'القاهرة' : 'Africa/Cairo'),
    );
    assert.equal('html' in message, false);
    assert.equal('attachments' in message, false);
    assert.equal(message.text.includes('250.00'), false);
  }
});
