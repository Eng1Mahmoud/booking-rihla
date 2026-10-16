import nodemailer from 'nodemailer';
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
export const sendAccountMail: SendAccountMail = async (message) => {
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
