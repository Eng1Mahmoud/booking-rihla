import nodemailer from 'nodemailer';
import { parseAuthEnv } from '../config/env.ts';
import { verificationEmail } from '../emails/verificationEmail.ts';
export interface VerificationMail {
  id: string;
  email: string;
  code: string;
  language: string;
}
export type SendVerificationMail = (message: VerificationMail) => Promise<void>;
export const sendVerificationMail: SendVerificationMail = async (message) => {
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
      messageId: '<verification-' + message.id + '@bus.local>',
      ...verificationEmail(message.code, message.language),
    });
  } finally {
    transport.close();
  }
};
