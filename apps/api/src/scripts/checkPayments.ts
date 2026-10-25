import { checkoutKey } from '../payments/checkoutEncryption.ts';
import { configuredPaymentCheckout } from '../services/paymentCheckoutService.ts';
import { createPaymobProvider } from '../payments/paymobProvider.ts';
// Configuration-only check: never creates an intention, moves funds.
try {
  configuredPaymentCheckout();
  const flag = process.env.PAYMOB_ENABLED;
  if (flag !== undefined && flag !== 'true' && flag !== 'false')
    throw new Error('Invalid payment configuration: PAYMOB_ENABLED');
  if (flag !== 'true')
    console.log(
      'Paymob is disabled. Add TEST settings to apps/api/.env before enabling it.',
    );
  else {
    createPaymobProvider();
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
