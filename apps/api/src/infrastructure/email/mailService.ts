// Mailjet client and ticket data types.
import Mailjet, { type SendEmailV3_1 } from 'node-mailjet';
import type {
  TicketData,
  TicketDetails,
} from '../../features/tickets/ticketService.ts';

// Email templates.
import { bookingNoticeEmail } from '../../emails/bookingNoticeEmail.ts';
import { departureReminderEmail } from '../../emails/departureReminderEmail.ts';
import { ticketEmail } from '../../emails/ticketEmail.ts';
import { verificationEmail } from '../../emails/verificationEmail.ts';
import {
  passwordResetEmail,
  passwordChangedEmail,
} from '../../emails/passwordResetEmail.ts';

// Message data and sender function types.
export interface AccountMail {
  id: string;
  email: string;
  code?: string;
  purpose: 'VERIFY_EMAIL' | 'PASSWORD_RESET' | 'PASSWORD_CHANGED';
  language: string;
}
export type SendAccountMail = (message: AccountMail) => Promise<void>;

export type SendTicketMail = (message: {
  email: string;
  language: string;
  ticket: TicketData;
}) => Promise<void>;

export type SendDepartureReminderMail = (message: {
  email: string;
  language: string;
  ticket: TicketDetails;
}) => Promise<void>;

export type SendBookingNotice = (message: {
  id: string;
  email: string;
  language: string;
  reference: string;
  purpose: 'TRIP_CANCELLED' | 'REFUND_SUCCEEDED';
  amountPiastres: string | null;
}) => Promise<void>;

interface OutgoingMail {
  to: string;
  trackingId: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType: string;
  }[];
}

// Shared Mailjet delivery for every email type.
async function sendMail(message: OutgoingMail): Promise<void> {
  const apiKey = process.env.MJ_APIKEY;
  const apiSecret = process.env.MJ_SECRETKEY;
  const senderEmail = process.env.EMAIL_FROM;
  if (!apiKey || !apiSecret || !senderEmail) {
    throw new Error('Set MJ_APIKEY, MJ_SECRETKEY and EMAIL_FROM');
  }

  const mailjet = new Mailjet.Client({
    apiKey,
    apiSecret,
    options: { timeout: 10000 },
  });
  const requestBody: SendEmailV3_1.Body = {
    Messages: [
      {
        From: {
          Email: senderEmail,
          Name: process.env.EMAIL_FROM_NAME || 'Rihla',
        },
        To: [{ Email: message.to }],
        Subject: message.subject,
        TextPart: message.text,
        HTMLPart: message.html,
        CustomID: message.trackingId,
        Attachments: message.attachments?.map((attachment) => ({
          Filename: attachment.filename,
          ContentType: attachment.contentType,
          Base64Content: attachment.content.toString('base64'),
        })),
      },
    ],
  };
  const response = await mailjet
    .post('send', { version: 'v3.1' })
    .request<SendEmailV3_1.Response>(requestBody);

  // Success means Mailjet accepted the message for delivery.
  if (response.body.Messages?.[0]?.Status !== 'success') {
    throw new Error('Mailjet did not accept the email');
  }
}

// Account emails: choose the template, then send it to the recipient.
export const sendAccountMail: SendAccountMail = async (message) => {
  let content;
  if (message.purpose === 'PASSWORD_CHANGED') {
    content = passwordChangedEmail(message.language);
  } else if (message.purpose === 'PASSWORD_RESET') {
    content = passwordResetEmail(message.code ?? '', message.language);
  } else {
    content = verificationEmail(message.code ?? '', message.language);
  }

  await sendMail({
    to: message.email,
    trackingId: '<account-' + message.id + '@bus.local>',
    ...content,
  });
};

// Booking emails: tickets, departure reminders and cancellation/refund notices.
export const sendTicketMail: SendTicketMail = async (message) => {
  await sendMail({
    to: message.email,
    trackingId: '<ticket-' + message.ticket.id + '@bus.local>',
    ...ticketEmail(message.ticket, message.language),
  });
};

export const sendDepartureReminderMail: SendDepartureReminderMail = async (
  message,
) => {
  await sendMail({
    to: message.email,
    trackingId: '<departure-reminder-' + message.ticket.id + '@bus.local>',
    ...departureReminderEmail(message.ticket, message.language),
  });
};

export const sendBookingNotice: SendBookingNotice = async (message) => {
  await sendMail({
    to: message.email,
    trackingId: '<booking-notice-' + message.id + '@bus.local>',
    ...bookingNoticeEmail(message),
  });
};
