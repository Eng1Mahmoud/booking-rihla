import { z } from 'zod';
const positiveId = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER));
const secureUrl = z.url({ protocol: /^https$/ }).refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return !url.username && !url.password && !url.hash && !url.search;
});
const schema = z.object({
  PAYMOB_SECRET_KEY: z.string().regex(/^(?:egy_)?sk_?test_[A-Za-z0-9_-]+$/),
  PAYMOB_PUBLIC_KEY: z.string().regex(/^(?:egy_)?pk_?test_[A-Za-z0-9_-]+$/),
  PAYMOB_API_KEY: z.string().min(1),
  PAYMOB_HMAC_SECRET: z.string().min(1),
  PAYMOB_INTEGRATION_ID: positiveId,
  PAYMOB_OWNER_ID: positiveId,
  // Set this only after Paymob enables Auth/Cap for the selected TEST card integration.
  PAYMOB_AUTH_CAPTURE_ENABLED: z.literal('true'),
  PAYMOB_NOTIFICATION_URL: secureUrl,
  PAYMOB_RETURN_URL: secureUrl,
});
export type PaymobConfig = z.infer<typeof schema>;
export function parsePaymobEnv(
  environment: NodeJS.ProcessEnv,
): PaymobConfig | null {
  if (
    environment['PAYMOB_ENABLED'] === undefined ||
    environment['PAYMOB_ENABLED'] === 'false'
  )
    return null;
  if (environment['PAYMOB_ENABLED'] !== 'true')
    throw new Error('Invalid payment configuration: PAYMOB_ENABLED');
  const result = schema.safeParse(environment);
  if (!result.success)
    throw new Error(
      'Invalid payment configuration: ' +
        [
          ...new Set(result.error.issues.map((issue) => issue.path.join('.'))),
        ].join(', '),
    );
  return result.data;
}

// Setup inspection does not enable the provider or trust an unknown owner.
export function inspectPaymobSetup(environment: NodeJS.ProcessEnv) {
  const credentials = schema
    .pick({
      PAYMOB_SECRET_KEY: true,
      PAYMOB_PUBLIC_KEY: true,
      PAYMOB_API_KEY: true,
      PAYMOB_HMAC_SECRET: true,
      PAYMOB_INTEGRATION_ID: true,
    })
    .safeParse(environment);
  const readiness = schema.safeParse(environment);
  const fields = (issues: z.core.$ZodIssue[]) => [
    ...new Set(issues.map((issue) => issue.path.join('.'))),
  ];
  return {
    credentialIssues: credentials.success
      ? []
      : fields(credentials.error.issues),
    remainingSettings: readiness.success ? [] : fields(readiness.error.issues),
  };
}
