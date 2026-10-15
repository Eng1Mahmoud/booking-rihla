import { z } from 'zod';

// Define a schema for the environment variables using Zod. This schema validates the expected environment variables and their types, providing default values where necessary.
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
