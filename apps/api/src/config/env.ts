import { z } from 'zod';

const originSchema = z
  .url({ protocol: /^https?$/ })
  .refine(
    (value) => URL.canParse(value) && new URL(value).origin === value,
    'Must be an HTTP(S) origin without a path, credentials, query, or fragment',
  );

const databaseEnvSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }).optional(),
});

// Server startup validates HTTP settings and the optional database URL together.
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  HOST: z.enum(['127.0.0.1', '0.0.0.0', '::1', '::']).default('127.0.0.1'),
  TRUST_PROXY_HOPS: z.enum(['0', '1']).default('0').transform(Number),
  API_CLIENT_CONTEXT_SECRET: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/)
    .optional(),
  PORT: z
    .string()
    .regex(/^\d+$/, 'Must contain only digits')
    .default('4000')
    .transform(Number)
    .pipe(z.number().int().min(1).max(65535)),
  DATABASE_URL: databaseEnvSchema.shape.DATABASE_URL,
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

// Database workers do not need HTTP settings such as PORT or CORS_ORIGINS.
export function parseDatabaseEnv(environment: NodeJS.ProcessEnv) {
  const result = databaseEnvSchema.safeParse(environment);
  if (!result.success)
    throw new Error('Invalid database configuration: DATABASE_URL');
  return result.data;
}

const authCodeEnvSchema = z.object({
  AUTH_CODE_SECRET: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/, 'Must be a 32-byte hexadecimal secret'),
});
export function parseAuthCodeEnv(environment: NodeJS.ProcessEnv) {
  const result = authCodeEnvSchema.safeParse(environment);
  if (!result.success)
    throw new Error(
      'Invalid authentication code configuration: AUTH_CODE_SECRET',
    );
  return result.data;
}

const mailEnvSchema = z
  .object({
    SMTP_HOST: z.string().trim().min(1).default('127.0.0.1'),
    SMTP_PORT: z
      .string()
      .regex(/^\d+$/)
      .default('1025')
      .transform(Number)
      .pipe(z.number().int().min(1).max(65535)),
    SMTP_REQUIRE_TLS: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
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
export function parseMailEnv(environment: NodeJS.ProcessEnv) {
  const result = mailEnvSchema.safeParse(environment);
  if (!result.success)
    throw new Error(
      'Invalid mail configuration: ' +
        result.error.issues.map((issue) => issue.path.join('.')).join(', '),
    );
  return result.data;
}

const sessionEnvSchema = z.object({
  AUTH_ACCESS_SECRET: z.string().regex(/^[a-fA-F0-9]{64}$/),
});
export function parseSessionEnv(environment: NodeJS.ProcessEnv) {
  const result = sessionEnvSchema.safeParse(environment);
  if (!result.success)
    throw new Error('Invalid session configuration: AUTH_ACCESS_SECRET');
  return result.data;
}
