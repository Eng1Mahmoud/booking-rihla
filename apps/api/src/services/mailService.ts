import { bookingNoticeEmail } from '../emails/bookingNoticeEmail.ts';
import { departureReminderEmail } from '../emails/departureReminderEmail.ts';
import Mailjet, { type SendEmailV3_1 } from 'node-mailjet';
import { ticketEmail } from '../emails/ticketEmail.ts';
import type { TicketData, TicketDetails } from './ticketService.ts';
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
interface OutgoingMail {
  to: string;
  messageId: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}

async function sendMail(message: OutgoingMail): Promise<void> {
  const apiKey = process.env.MJ_APIKEY;
  const apiSecret = process.env.MJ_SECRETKEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !apiSecret || !from)
    throw new Error('Set MJ_APIKEY, MJ_SECRETKEY and EMAIL_FROM');

  const mailjet = new Mailjet.Client({
    apiKey,
    apiSecret,
    options: { timeout: 10000 },
  });
  const body: SendEmailV3_1.Body = {
    Messages: [
      {
        From: { Email: from, Name: process.env.EMAIL_FROM_NAME || 'Rihla' },
        To: [{ Email: message.to }],
        Subject: message.subject,
        TextPart: message.text,
        HTMLPart: message.html,
        CustomID: message.messageId,
        Attachments: message.attachments?.map((attachment) => ({
          Filename: attachment.filename,
          ContentType: attachment.contentType,
          Base64Content: attachment.content.toString('base64'),
        })),
      },
    ],
  };
  const result = await mailjet
    .post('send', { version: 'v3.1' })
    .request<SendEmailV3_1.Response>(body);
  if (result.body.Messages?.[0]?.Status !== 'success')
    throw new Error('Mailjet did not accept the email');
}
export const sendAccountMail: SendAccountMail = async (message) => {
  await sendMail({
    to: message.email,
    messageId: '<account-' + message.id + '@bus.local>',
    ...(message.purpose === 'PASSWORD_CHANGED'
      ? passwordChangedEmail(message.language)
      : message.purpose === 'PASSWORD_RESET'
        ? passwordResetEmail(message.code ?? '', message.language)
        : verificationEmail(message.code ?? '', message.language)),
  });
};

export type SendTicketMail = (message: {
  email: string;
  language: string;
  ticket: TicketData;
}) => Promise<void>;
export const sendTicketMail: SendTicketMail = async (message) => {
  await sendMail({
    to: message.email,
    messageId: '<ticket-' + message.ticket.id + '@bus.local>',
    ...ticketEmail(message.ticket, message.language),
  });
};

export type SendDepartureReminderMail = (message: {
  email: string;
  language: string;
  ticket: TicketDetails;
}) => Promise<void>;
export const sendDepartureReminderMail: SendDepartureReminderMail = async (
  message,
) => {
  await sendMail({
    to: message.email,
    messageId: '<departure-reminder-' + message.ticket.id + '@bus.local>',
    ...departureReminderEmail(message.ticket, message.language),
  });
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
  await sendMail({
    to: message.email,
    messageId: '<booking-notice-' + message.id + '@bus.local>',
    ...bookingNoticeEmail(message),
  });
};
