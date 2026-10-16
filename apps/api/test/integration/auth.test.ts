import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { verify } from 'argon2';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';
import { processEmailOutbox } from '../../src/services/emailOutboxService.ts';
import { decryptVerificationCode } from '../../src/utils/authCrypto.ts';
import type { AccountMail } from '../../src/services/mailService.ts';

test('registration, single-use verification, resend limits and retrying encrypted outbox are atomic in PostgreSQL', async (t) => {
  const server = createApp([]).listen(0, '127.0.0.1');
  const users: string[] = [];
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      for (const id of users) await db.orm.public.User.where({ id }).delete();
    } finally {
      await db.close();
    }
  });
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = 'http://127.0.0.1:' + address.port + '/api/v1/auth';
  const json = { 'Content-Type': 'application/json' };
  const password = 'Learning-password-2026';
  async function post(path: string, body: object) {
    return await fetch(base + path, {
      method: 'POST',
      headers: json,
      body: JSON.stringify(body),
    });
  }
  async function account(label: string) {
    const email = label + '-' + randomUUID() + '@example.test';
    const response = await post('/register', {
      name: 'مستخدم اختبار',
      email,
      phone: '+201012345678',
      password,
      language: 'en',
    });
    const user = await db.orm.public.User.where({ email }).first();
    if (user) users.push(user.id);
    assert.equal(response.status, 202);
    assert.ok(user);
    return {
      ...user,
      verificationId: (await response.json()).verificationId as string,
    };
  }
  async function codeFor(userId: string) {
    const message = await db.orm.public.EmailOutbox.where({ userId }).first();
    assert.ok(message?.encryptedCode);
    return decryptVerificationCode(userId, message.encryptedCode);
  }
  async function invalid(response: Response) {
    assert.equal(response.status, 400);
    assert.equal(
      (await response.json()).error.code,
      'INVALID_VERIFICATION_CODE',
    );
  }
  const user = await account('verify');
  assert.equal(user.emailVerifiedAt, null);
  assert.match(user.passwordHash, /^\$argon2id\$/);
  assert.ok(await verify(user.passwordHash, password));
  const code = await codeFor(user.id);
  const challenge = await db.orm.public.EmailVerification.where({
    userId: user.id,
  }).first();
  assert.ok(challenge);
  assert.notEqual(challenge.codeHash, code);
  assert.equal(challenge.attempts, 0);
  assert.ok(Date.parse(challenge.expiresAt) > Date.now());
  const duplicate = await post('/register', {
    name: 'Attacker',
    email: user.email.toUpperCase(),
    phone: '+201099999999',
    password: 'Different-password-2026',
  });
  assert.equal(duplicate.status, 202);
  assert.equal(
    (await db.orm.public.User.where({ id: user.id }).first())?.passwordHash,
    user.passwordHash,
  );
  assert.equal(
    (await db.orm.public.EmailOutbox.where({ userId: user.id }).all()).length,
    1,
  );
  const deliveries: AccountMail[] = [];
  const workerResults = await Promise.all([
    processEmailOutbox(async (message) => {
      deliveries.push(message);
    }, user.id),
    processEmailOutbox(async (message) => {
      deliveries.push(message);
    }, user.id),
  ]);
  assert.equal(
    workerResults.reduce((count, result) => count + result.sent, 0),
    1,
  );
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0]?.code, code);
  const delivered = await db.orm.public.EmailOutbox.where({
    userId: user.id,
  }).first();
  assert.ok(delivered?.sentAt);
  assert.equal(delivered.encryptedCode, null);
  const confirmations = await Promise.all([
    post('/verify-email', {
      verificationId: user.verificationId,
      email: user.email,
      code,
    }),
    post('/verify-email', {
      verificationId: user.verificationId,
      email: user.email,
      code,
    }),
  ]);
  assert.deepEqual(confirmations.map((r) => r.status).sort(), [200, 400]);
  assert.ok(
    (await db.orm.public.User.where({ id: user.id }).first())?.emailVerifiedAt,
  );
  assert.equal(
    await db.orm.public.EmailVerification.where({ userId: user.id }).first(),
    null,
  );
  assert.equal(
    (await db.orm.public.EmailOutbox.where({ userId: user.id }).all()).length,
    0,
  );
  await invalid(
    await post('/verify-email', {
      verificationId: randomUUID(),
      email: 'missing-' + randomUUID() + '@example.test',
      code: '000000',
    }),
  );
  assert.equal(
    (
      await post('/resend-verification', {
        verificationId: user.verificationId,
        email: user.email,
      })
    ).status,
    202,
  );
  assert.equal(
    (
      await post('/resend-verification', {
        verificationId: randomUUID(),
        email: 'missing@example.test',
      })
    ).status,
    202,
  );
  const brute = await account('brute');
  const correct = await codeFor(brute.id),
    wrong = correct === '000000' ? '000001' : '000000';
  const failures = await Promise.all(
    Array.from({ length: 7 }, () =>
      post('/verify-email', {
        verificationId: brute.verificationId,
        email: brute.email,
        code: wrong,
      }),
    ),
  );
  assert.ok(failures.every((r) => r.status === 400));
  assert.equal(
    (await db.orm.public.EmailVerification.where({ userId: brute.id }).first())
      ?.attempts,
    5,
  );
  await invalid(
    await post('/verify-email', {
      verificationId: brute.verificationId,
      email: brute.email,
      code: correct,
    }),
  );
  let sentLockedCode = false;
  assert.equal(
    (
      await processEmailOutbox(async () => {
        sentLockedCode = true;
      }, brute.id)
    ).discarded,
    1,
  );
  assert.equal(sentLockedCode, false);
  const resend = await account('resend');
  const oldCode = await codeFor(resend.id);
  const oldMessage = await db.orm.public.EmailOutbox.where({
    userId: resend.id,
  }).first();
  assert.ok(oldMessage);
  assert.equal(
    (
      await post('/resend-verification', {
        verificationId: resend.verificationId,
        email: resend.email,
      })
    ).status,
    202,
  );
  assert.equal(
    (await db.orm.public.EmailOutbox.where({ userId: resend.id }).first())?.id,
    oldMessage.id,
  );
  await db.orm.public.EmailVerification.where({ userId: resend.id }).update({
    resendAfter: '2000-01-01T00:00:00Z',
  });
  await Promise.all([
    post('/resend-verification', {
      verificationId: resend.verificationId,
      email: resend.email,
    }),
    post('/resend-verification', {
      verificationId: resend.verificationId,
      email: resend.email,
    }),
  ]);
  const newCode = await codeFor(resend.id);
  assert.notEqual(newCode, oldCode);
  assert.equal(
    (await db.orm.public.EmailVerification.where({ userId: resend.id }).first())
      ?.sendCount,
    2,
  );
  assert.equal(
    (await db.orm.public.EmailOutbox.where({ userId: resend.id }).all()).length,
    1,
  );
  await invalid(
    await post('/verify-email', {
      verificationId: resend.verificationId,
      email: resend.email,
      code: oldCode,
    }),
  );
  await db.orm.public.EmailVerification.where({ userId: resend.id }).update({
    sendCount: 5,
    resendAfter: '2000-01-01T00:00:00Z',
  });
  await post('/resend-verification', {
    verificationId: resend.verificationId,
    email: resend.email,
  });
  assert.equal(await codeFor(resend.id), newCode);
  await db.orm.public.EmailVerification.where({ userId: resend.id }).update({
    windowStartedAt: '2000-01-01T00:00:00Z',
  });
  await post('/resend-verification', {
    verificationId: resend.verificationId,
    email: resend.email,
  });
  assert.equal(
    (await db.orm.public.EmailVerification.where({ userId: resend.id }).first())
      ?.sendCount,
    1,
  );
  const expired = await account('expired');
  const expiredCode = await codeFor(expired.id);
  await db.orm.public.EmailVerification.where({ userId: expired.id }).update({
    expiresAt: '2000-01-01T00:00:00Z',
  });
  await invalid(
    await post('/verify-email', {
      verificationId: expired.verificationId,
      email: expired.email,
      code: expiredCode,
    }),
  );
  let sentExpired = false;
  assert.equal(
    (
      await processEmailOutbox(async () => {
        sentExpired = true;
      }, expired.id)
    ).discarded,
    1,
  );
  assert.equal(sentExpired, false);
  const retry = await account('retry');
  const retryCode = await codeFor(retry.id);
  const failed = await processEmailOutbox(async () => {
    throw Error('SMTP temporarily unavailable');
  }, retry.id);
  assert.equal(failed.failed, 1);
  const pending = await db.orm.public.EmailOutbox.where({
    userId: retry.id,
  }).first();
  assert.ok(pending?.encryptedCode);
  assert.equal(pending.attempts, 1);
  assert.ok(Date.parse(pending.nextAttemptAt) > Date.now());
  let retries = 0;
  await processEmailOutbox(async () => {
    retries++;
  }, retry.id);
  assert.equal(retries, 0);
  await db.orm.public.EmailOutbox.where({ userId: retry.id }).update({
    nextAttemptAt: '2000-01-01T00:00:00Z',
  });
  assert.equal(
    (
      await processEmailOutbox(async (message) => {
        assert.equal(message.code, retryCode);
        retries++;
      }, retry.id)
    ).sent,
    1,
  );
  assert.equal(retries, 1);
  const exhausted = await account('exhausted');
  for (let i = 0; i < 5; i++) {
    await db.orm.public.EmailOutbox.where({ userId: exhausted.id }).update({
      nextAttemptAt: '2000-01-01T00:00:00Z',
    });
    await processEmailOutbox(async () => {
      throw Error('SMTP failed');
    }, exhausted.id);
  }
  const abandoned = await db.orm.public.EmailOutbox.where({
    userId: exhausted.id,
  }).first();
  assert.ok(abandoned?.discardedAt);
  assert.equal(abandoned.attempts, 5);
  assert.equal(abandoned.encryptedCode, null);
  const concurrentEmail = 'parallel-' + randomUUID() + '@example.test';
  const body = {
    name: 'Parallel',
    email: concurrentEmail,
    phone: '+201012345678',
    password,
  };
  const registrations = await Promise.all([
    post('/register', body),
    post('/register', body),
  ]);
  const concurrent = await db.orm.public.User.where({
    email: concurrentEmail,
  }).first();
  if (concurrent) users.push(concurrent.id);
  assert.ok(concurrent);
  assert.ok(registrations.every((r) => r.status === 202));
  assert.equal(
    (await db.orm.public.User.where({ email: concurrentEmail }).all()).length,
    1,
  );
  assert.equal(
    (await db.orm.public.EmailOutbox.where({ userId: concurrent.id }).all())
      .length,
    1,
  );
});
