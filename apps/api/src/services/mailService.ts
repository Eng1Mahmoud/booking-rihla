import { bookingNoticeEmail } from '../emails/bookingNoticeEmail.ts';
import { departureReminderEmail } from '../emails/departureReminderEmail.ts';
import type { TicketDetails } from './ticketService.ts';
import nodemailer from 'nodemailer';
import { ticketEmail } from '../emails/ticketEmail.ts';
import type { TicketData } from './ticketService.ts';
import { verificationEmail } from '../emails/verificationEmail.ts';
import {
  passwordResetEmail,
  passwordChangedEmail,
} from '../emails/passwordResetEmail.ts';
export interface AccountMail {
  id: string;
  email: string;
  code?: string;
  purpose: 'VERIFY_EMAIL' | 'PASSWORD_RESET' | 'PASSWORD_CHANGED';
  language: string;
}
export type SendAccountMail = (message: AccountMail) => Promise<void>;
function mailTransport() {
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (Boolean(user) !== Boolean(password))
    throw new Error('Set SMTP_USER and SMTP_PASSWORD together');
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim() ?? '127.0.0.1',
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: process.env.SMTP_SECURE === 'true',
    requireTLS: process.env.SMTP_REQUIRE_TLS === 'true',
    ...(user ? { auth: { user, pass: password } } : {}),
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return { from: process.env.SMTP_FROM ?? 'noreply@bus.local', transport };
}
export const sendAccountMail: SendAccountMail = async (message) => {
  const { from, transport } = mailTransport();
  try {
    await transport.sendMail({
      from,
      to: message.email,
      messageId: '<account-' + message.id + '@bus.local>',
      ...(message.purpose === 'PASSWORD_CHANGED'
        ? passwordChangedEmail(message.language)
        : message.purpose === 'PASSWORD_RESET'
          ? passwordResetEmail(message.code ?? '', message.language)
          : verificationEmail(message.code ?? '', message.language)),
    });
  } finally {
    transport.close();
  }
};

export type SendTicketMail = (message: {
  email: string;
  language: string;
  ticket: TicketData;
}) => Promise<void>;
export const sendTicketMail: SendTicketMail = async (message) => {
  const { from, transport } = mailTransport();
  try {
    await transport.sendMail({
      from,
      to: message.email,
      messageId: '<ticket-' + message.ticket.id + '@bus.local>',
      ...ticketEmail(message.ticket, message.language),
    });
  } finally {
    transport.close();
  }
};

export type SendDepartureReminderMail = (message: {
  email: string;
  language: string;
  ticket: TicketDetails;
}) => Promise<void>;
export const sendDepartureReminderMail: SendDepartureReminderMail = async (
  message,
) => {
  const { from, transport } = mailTransport();
  try {
    await transport.sendMail({
      from,
      to: message.email,
      messageId: '<departure-reminder-' + message.ticket.id + '@bus.local>',
      ...departureReminderEmail(message.ticket, message.language),
    });
  } finally {
    transport.close();
  }
};

export type SendBookingNotice = (message: {
  id: string;
  email: string;
  language: string;
  reference: string;
  purpose: 'TRIP_CANCELLED' | 'REFUND_SUCCEEDED';
  amountPiastres: string | null;
}) => Promise<void>;
export const sendBookingNotice: SendBookingNotice = async (message) => {
  const { from, transport } = mailTransport();
  try {
    await transport.sendMail({
      from,
      to: message.email,
      messageId: '<booking-notice-' + message.id + '@bus.local>',
      ...bookingNoticeEmail(message),
    });
  } finally {
    transport.close();
  }
};
