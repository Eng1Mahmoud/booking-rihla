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
    'TEST credential formats are valid locally. Remote validity is not verified.',
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
    'Use the account user id from an authenticated API-key response (profile.user.id), then verify it matches owner on the first TEST transaction inquiry. Never substitute profile.id.',
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
  'Keep activation flags false during setup; enable them only for a controlled TEST payment/refund verification once all required settings and workers are ready. No LIVE credentials are accepted by this adapter.',
);
