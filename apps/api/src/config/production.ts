import { parseEnv, parseAuthEnv, parseSessionEnv } from './env.ts';
import {
  parsePaymobEnv,
  parsePaymobCheckoutEnv,
  parsePaymobWebhookEnv,
} from './paymob.ts';
import { checkoutKey } from '../payments/checkoutEncryption.ts';
export function validateProductionEnv(environment: NodeJS.ProcessEnv) {
  const env = parseEnv(environment);
  if (env.NODE_ENV !== 'production') return;
  if (!env.DATABASE_URL) throw new Error('Production requires DATABASE_URL');
  if (env.CORS_ORIGINS.some((origin) => !origin.startsWith('https://')))
    throw new Error('Production CORS origins must use HTTPS');
  const mail = parseAuthEnv(environment);
  const session = parseSessionEnv(environment);
  if (!mail.SMTP_SECURE && !mail.SMTP_REQUIRE_TLS)
    throw new Error('Production SMTP requires TLS');
  if (
    mail.AUTH_CODE_SECRET.toLowerCase() ===
    session.AUTH_ACCESS_SECRET.toLowerCase()
  )
    throw new Error('Authentication secrets must be independent');
  const provider = parsePaymobEnv(environment);
  const checkout = parsePaymobCheckoutEnv(environment);
  parsePaymobWebhookEnv(environment);
  if (checkout) {
    const key = checkoutKey(environment).toString('hex');
    if (
      [
        mail.AUTH_CODE_SECRET.toLowerCase(),
        session.AUTH_ACCESS_SECRET.toLowerCase(),
      ].includes(key)
    )
      throw new Error('Checkout encryption key must be independent');
  }
  const refunds = environment['PAYMOB_REFUNDS_ENABLED'];
  if (refunds !== undefined && refunds !== 'true' && refunds !== 'false')
    throw new Error('Invalid payment configuration: PAYMOB_REFUNDS_ENABLED');
  if (refunds === 'true' && !provider)
    throw new Error('Refunds require PAYMOB_ENABLED');
}
