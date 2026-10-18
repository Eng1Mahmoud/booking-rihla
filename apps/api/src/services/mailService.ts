import { bookingNoticeEmail } from '../emails/bookingNoticeEmail.ts';
import { departureReminderEmail } from '../emails/departureReminderEmail.ts';
import type { TicketDetails } from './ticketService.ts';
import nodemailer from 'nodemailer';
import { ticketEmail } from '../emails/ticketEmail.ts';
import type { TicketData } from './ticketService.ts';
import { parseAuthEnv } from '../config/env.ts';
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
  const env = parseAuthEnv(process.env);
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
      : {}),
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return { env, transport };
}
export const sendAccountMail: SendAccountMail = async (message) => {
  const { env, transport } = mailTransport();
  try {
    await transport.sendMail({
      from: env.SMTP_FROM,
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
  const { env, transport } = mailTransport();
  try {
    await transport.sendMail({
      from: env.SMTP_FROM,
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
  const { env, transport } = mailTransport();
  try {
    await transport.sendMail({
      from: env.SMTP_FROM,
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
  const { env, transport } = mailTransport();
  try {
    await transport.sendMail({
      from: env.SMTP_FROM,
      to: message.email,
      messageId: '<booking-notice-' + message.id + '@bus.local>',
      ...bookingNoticeEmail(message),
    });
  } finally {
    transport.close();
  }
};
