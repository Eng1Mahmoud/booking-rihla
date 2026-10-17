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
