import { checkoutKey } from '../payments/checkoutEncryption.ts';
import { parsePaymobEnv } from '../config/paymob.ts';
// Configuration-only check: never creates an intention, captures or voids funds.
try {
  const config = parsePaymobEnv(process.env);
  if (!config)
    console.log(
      'Paymob is disabled. Add TEST settings to apps/api/.env before enabling it.',
    );
  else {
    checkoutKey(process.env);
    console.log(
      'Paymob TEST configuration is valid locally. Account permissions and Auth/Cap still require verification in Paymob; no payment request was sent.',
    );
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Invalid payment configuration',
  );
  process.exitCode = 1;
}
