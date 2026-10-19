import { checkoutKey } from '../payments/checkoutEncryption.ts';
import { parsePaymobCheckoutEnv, parsePaymobEnv } from '../config/paymob.ts';
// Configuration-only check: never creates an intention, moves funds.
try {
  parsePaymobCheckoutEnv(process.env);
  const config = parsePaymobEnv(process.env);
  if (!config)
    console.log(
      'Paymob is disabled. Add TEST settings to apps/api/.env before enabling it.',
    );
  else {
    checkoutKey(process.env);
    console.log(
      'Paymob TEST configuration is valid locally. TEST payment and refund behavior still require verification in Paymob; no payment request was sent.',
    );
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Invalid payment configuration',
  );
  process.exitCode = 1;
}
