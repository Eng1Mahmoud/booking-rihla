import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { parseEnv } from '../src/config/env.ts';

test('missing settings use development defaults', () => {
  assert.deepEqual(parseEnv({}), { NODE_ENV: 'development', PORT: 4000 });
});

test('valid settings produce a numeric port', () => {
  assert.deepEqual(parseEnv({ NODE_ENV: 'production', PORT: '4500' }), {
    NODE_ENV: 'production', PORT: 4500,
  });
});

test('invalid ports and modes are rejected', () => {
  for (const PORT of ['', ' ', '0', '-1', '65536', '4000.5', 'abc', '1e3']) {
    assert.throws(() => parseEnv({ PORT }), /Invalid environment configuration: PORT:/);
  }
  assert.throws(() => parseEnv({ NODE_ENV: 'staging' }), /NODE_ENV:/);
});

test('configuration errors do not expose environment values', () => {
  const secret = 'private-value-that-must-not-appear';
  assert.throws(
    () => parseEnv({ PORT: secret, API_SECRET: secret }),
    (error: unknown) => error instanceof Error && !error.message.includes(secret),
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
