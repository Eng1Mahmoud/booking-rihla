import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { parseEnv } from '../src/config/env.ts';

test('missing settings use development defaults', () => {
  assert.deepEqual(parseEnv({}), {
    NODE_ENV: 'development',
    PORT: 4000,
    CORS_ORIGINS: ['http://localhost:3000', 'http://localhost:3001'],
  });
});

test('valid settings produce a numeric port', () => {
  assert.deepEqual(parseEnv({ NODE_ENV: 'production', PORT: '4500' }), {
    NODE_ENV: 'production',
    PORT: 4500,
    CORS_ORIGINS: ['http://localhost:3000', 'http://localhost:3001'],
  });
});

test('invalid ports and modes are rejected', () => {
  for (const PORT of ['', ' ', '0', '-1', '65536', '4000.5', 'abc', '1e3']) {
    assert.throws(
      () => parseEnv({ PORT }),
      /Invalid environment configuration: PORT:/,
    );
  }
  assert.throws(() => parseEnv({ NODE_ENV: 'staging' }), /NODE_ENV:/);
});

test('configuration errors do not expose environment values', () => {
  const secret = 'private-value-that-must-not-appear';
  assert.throws(
    () => parseEnv({ PORT: secret, API_SECRET: secret }),
    (error: unknown) =>
      error instanceof Error && !error.message.includes(secret),
  );
});

test('server exits before listening when configuration is invalid', () => {
  const result = spawnSync(process.execPath, ['src/server.ts'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, NODE_ENV: 'test', PORT: 'invalid' },
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid environment configuration: PORT:/);
  assert.doesNotMatch(result.stdout, /API running/);
});

test('CORS origins are split and trimmed into an explicit allowlist', () => {
  const env = parseEnv({
    CORS_ORIGINS: 'https://web.example.com, https://admin.example.com',
  });
  assert.deepEqual(env.CORS_ORIGINS, [
    'https://web.example.com',
    'https://admin.example.com',
  ]);
});

test('invalid CORS configuration is rejected without exposing its values', () => {
  for (const CORS_ORIGINS of [
    '',
    '*',
    'null',
    'not-a-url',
    'ftp://example.com',
    'https://example.com/path',
    'https://example.com/',
    'https://example.com?token=private',
    'https://user:private@example.com',
    'https://example.com,',
  ]) {
    assert.throws(
      () => parseEnv({ CORS_ORIGINS }),
      (error: unknown) =>
        error instanceof Error &&
        /Invalid environment configuration: CORS_ORIGINS/.test(error.message) &&
        !error.message.includes('private'),
    );
  }
});
