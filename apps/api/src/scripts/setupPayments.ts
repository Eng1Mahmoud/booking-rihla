import { inspectPaymobSetup } from '../config/paymob.ts';

// Local inspection only: no database, network, payment or environment-file writes.
const setup = inspectPaymobSetup(process.env);
if (setup.credentialIssues.length) {
  console.error(
    'Missing or invalid TEST credentials: ' + setup.credentialIssues.join(', '),
  );
  process.exitCode = 1;
} else {
  console.log(
    'TEST credential formats are valid locally. Remote validity and Auth/Cap are not verified.',
  );
}
if (setup.remainingSettings.length)
  console.log(
    'Remaining provider settings: ' + setup.remainingSettings.join(', '),
  );
console.log(
  'An existing transaction and PAYMOB_OWNER_ID are not required for this setup check.',
);
console.log(
  'Payment remains subject to strict provider validation. No payment request was sent.',
);

const instructions: Record<string, string> = {
  PAYMOB_OWNER_ID:
    'Obtain the transaction owner from an authenticated TEST transaction inquiry or confirmation from Paymob. Do not substitute the merchant profile id.',
  PAYMOB_AUTH_CAPTURE_ENABLED:
    'Ask Paymob to confirm Auth/Capture for this TEST card Integration ID and the Intention API request fields. Setting true here does not enable it on the account.',
  PAYMOB_NOTIFICATION_URL:
    'Use the reachable public HTTPS API webhook URL. Paymob cannot call your localhost address.',
  PAYMOB_RETURN_URL:
    'Use the HTTPS checkout-result page URL. The browser redirect is not payment confirmation.',
};
for (const field of setup.remainingSettings) {
  const instruction = instructions[field];
  if (instruction) console.log(field + ': ' + instruction);
}
console.log(
  'Keep all activation flags false until account capability and the complete TEST payment/refund flow have been verified. No LIVE credentials are accepted by this adapter.',
);
