import { z } from 'zod';

const originSchema = z
  .url({ protocol: /^https?$/ })
  .refine(
    (value) => URL.canParse(value) && new URL(value).origin === value,
    'Must be an HTTP(S) origin without a path, credentials, query, or fragment',
  );

// Define the environment settings and validate them before starting the server.
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z
    .string()
    .regex(/^\d+$/, 'Must contain only digits')
    .default('4000')
    .transform(Number)
    .pipe(z.number().int().min(1).max(65535)),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }).optional(),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:3001')
    .transform((value) => value.split(',').map((origin) => origin.trim()))
    .pipe(z.array(originSchema).min(1)),
});

export function parseEnv(environment: NodeJS.ProcessEnv) {
  const result = envSchema.safeParse(environment);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    // Report the invalid fields without dumping environment values or secrets.
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return result.data;
}

const authEnvSchema = z
  .object({
    AUTH_CODE_SECRET: z
      .string()
      .regex(/^[a-fA-F0-9]{64}$/, 'Must be a 32-byte hexadecimal secret'),
    SMTP_HOST: z.string().trim().min(1).default('127.0.0.1'),
    SMTP_PORT: z
      .string()
      .regex(/^\d+$/)
      .default('1025')
      .transform(Number)
      .pipe(z.number().int().min(1).max(65535)),
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    SMTP_FROM: z.email().default('noreply@bus.local'),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASSWORD: z.string().min(1).optional(),
  })
  .refine(
    (value) => Boolean(value.SMTP_USER) === Boolean(value.SMTP_PASSWORD),
    {
      message: 'Set SMTP_USER and SMTP_PASSWORD together',
      path: ['SMTP_USER'],
    },
  );
export function parseAuthEnv(environment: NodeJS.ProcessEnv) {
  const result = authEnvSchema.safeParse(environment);
  if (!result.success)
    throw new Error(
      'Invalid authentication/mail configuration: ' +
        result.error.issues.map((issue) => issue.path.join('.')).join(', '),
    );
  return result.data;
}
