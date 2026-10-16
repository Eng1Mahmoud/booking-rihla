import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { verify } from 'argon2';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';
import { passwordResetService } from '../../src/services/passwordResetService.ts';
import { processEmailOutbox } from '../../src/services/emailOutboxService.ts';
import {
  decryptVerificationCode,
  decryptPasswordResetCode,
} from '../../src/utils/authCrypto.ts';
import type { AccountMail } from '../../src/services/mailService.ts';

test('password recovery consumes codes once, revokes every session and recovers pending accounts without weakening verification', async (t) => {
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
  const password = 'Original-password-2026',
    newPassword = 'Recovered-password-2026';
  async function post(
    path: string,
    body: object,
    extra: Record<string, string> = {},
  ) {
    return await fetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...extra },
      body: JSON.stringify(body),
    });
  }
  async function account(label: string, verified = true) {
    const email = label + '-' + randomUUID() + '@example.test';
    const registration = await post('/register', {
      name: 'Recovery test',
      email,
      phone: '+201012345678',
      password,
    });
    assert.equal(registration.status, 202);
    const verificationId = (await registration.json()).verificationId;
    const user = await db.orm.public.User.where({ email }).first();
    assert.ok(user);
    users.push(user.id);
    if (verified) {
      const queued = await db.orm.public.EmailOutbox.where({
        userId: user.id,
        purpose: 'VERIFY_EMAIL',
      }).first();
      assert.ok(queued?.encryptedCode);
      assert.equal(
        (
          await post('/verify-email', {
            email,
            verificationId,
            code: decryptVerificationCode(user.id, queued.encryptedCode),
          })
        ).status,
        200,
      );
    }
    return { ...user, verificationId };
  }
  async function resetCode(userId: string) {
    const message = await db.orm.public.EmailOutbox.where({
      userId,
      purpose: 'PASSWORD_RESET',
    }).first();
    assert.ok(message?.encryptedCode);
    return {
      code: decryptPasswordResetCode(userId, message.encryptedCode),
      message,
    };
  }
  async function reset(email: string, code: string) {
    return await post('/reset-password', {
      email,
      code,
      newPassword,
      confirmPassword: newPassword,
    });
  }
  async function invalid(response: Response) {
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'INVALID_RESET_CODE');
  }
  async function login(email: string, pass = password) {
    const response = await post(
      '/login',
      { email, password: pass },
      { 'X-CSRF-Protection': '1' },
    );
    assert.equal(response.status, 200);
    return {
      access: (await response.json()).data.accessToken,
      cookie: response.headers.get('set-cookie')!.split(';')[0]!,
    };
  }
  const user = await account('main');
  const a = await login(user.email),
    b = await login(user.email);
  const unknown = await post('/forgot-password', {
    email: 'missing-' + randomUUID() + '@example.test',
  });
  assert.equal(unknown.status, 202);
  const generic = await unknown.json();
  const request = await post('/forgot-password', {
    email: user.email.toUpperCase(),
  });
  assert.equal(request.status, 202);
  assert.deepEqual(await request.json(), generic);
  const first = await resetCode(user.id);
  assert.deepEqual(
    await (await post('/forgot-password', { email: user.email })).json(),
    generic,
  );
  assert.equal((await resetCode(user.id)).message.id, first.message.id);
  // Merely asking for recovery must not change credentials, account lockout or sessions.
  assert.equal(
    (await db.orm.public.User.where({ id: user.id }).first())?.passwordHash,
    user.passwordHash,
  );
  assert.equal(
    (
      await db.orm.public.Session.where({
        userId: user.id,
        revokedAt: null,
      }).all()
    ).length,
    2,
  );
  const delivered: AccountMail[] = [];
  assert.equal(
    (
      await processEmailOutbox(async (message) => {
        delivered.push(message);
      }, user.id)
    ).sent,
    1,
  );
  assert.equal(delivered[0]?.purpose, 'PASSWORD_RESET');
  assert.equal(delivered[0]?.code, first.code);
  const simultaneous = await Promise.all([
    reset(user.email, first.code),
    reset(user.email, first.code),
  ]);
  assert.deepEqual(simultaneous.map((r) => r.status).sort(), [200, 400]);
  assert.ok(simultaneous.every((r) => r.headers.get('set-cookie') === null));
  const changed = await db.orm.public.User.where({ id: user.id }).first();
  assert.ok(changed);
  assert.ok(await verify(changed.passwordHash, newPassword));
  assert.ok(!(await verify(changed.passwordHash, password)));
  const consumed = await db.orm.public.PasswordReset.where({
    userId: user.id,
  }).first();
  assert.ok(consumed?.consumedAt);
  assert.equal(consumed.codeHash, null);
  assert.equal(
    (
      await db.orm.public.Session.where({
        userId: user.id,
        revokedAt: null,
      }).all()
    ).length,
    0,
  );
  for (const session of [a, b]) {
    assert.equal(
      (
        await fetch(base + '/me', {
          headers: { Authorization: 'Bearer ' + session.access },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await post(
          '/refresh',
          {},
          { 'X-CSRF-Protection': '1', Cookie: session.cookie },
        )
      ).status,
      401,
    );
  }
  assert.equal(
    (
      await post(
        '/login',
        { email: user.email, password },
        { 'X-CSRF-Protection': '1' },
      )
    ).status,
    401,
  );
  await login(user.email, newPassword);
  await invalid(await reset(user.email, first.code));
  const notification = await db.orm.public.EmailOutbox.where({
    userId: user.id,
    purpose: 'PASSWORD_CHANGED',
  }).first();
  assert.ok(notification);
  assert.equal(notification.encryptedCode, null);
  let notice: AccountMail | undefined;
  assert.equal(
    (
      await processEmailOutbox(async (message) => {
        notice = message;
      }, user.id)
    ).sent,
    1,
  );
  assert.equal(notice?.purpose, 'PASSWORD_CHANGED');
  assert.equal(notice?.code, undefined);
  // Hourly quota survives successful consumption and a newly requested code.
  await db.orm.public.PasswordReset.where({ userId: user.id }).update({
    resendAfter: '2000-01-01T00:00:00Z',
  });
  await passwordResetService.requestReset(user.email);
  assert.equal(
    (await db.orm.public.PasswordReset.where({ userId: user.id }).first())
      ?.sendCount,
    2,
  );
  const pending = await account('pending', false);
  await passwordResetService.requestReset(pending.email);
  assert.equal(
    (await db.orm.public.EmailOutbox.where({ userId: pending.id }).all())
      .length,
    2,
  );
  // Activation mail resends must not erase the separately queued reset mail.
  await db.orm.public.EmailVerification.where({ userId: pending.id }).update({
    resendAfter: '2000-01-01T00:00:00Z',
  });
  assert.equal(
    (
      await post('/resend-verification', {
        email: pending.email,
        verificationId: pending.verificationId,
      })
    ).status,
    202,
  );
  const pendingReset = await resetCode(pending.id);
  assert.equal((await reset(pending.email, pendingReset.code)).status, 200);
  assert.ok(
    (await db.orm.public.User.where({ id: pending.id }).first())
      ?.emailVerifiedAt,
  );
  assert.equal(
    await db.orm.public.EmailVerification.where({ userId: pending.id }).first(),
    null,
  );
  await login(pending.email, newPassword);
  const protectedUser = await account('limits');
  await passwordResetService.requestReset(protectedUser.email);
  const initial = await resetCode(protectedUser.id);
  await db.orm.public.PasswordReset.where({ userId: protectedUser.id }).update({
    resendAfter: '2000-01-01T00:00:00Z',
  });
  await Promise.all([
    passwordResetService.requestReset(protectedUser.email),
    passwordResetService.requestReset(protectedUser.email),
  ]);
  const replacement = await resetCode(protectedUser.id);
  assert.notEqual(replacement.code, initial.code);
  assert.equal(
    (
      await db.orm.public.PasswordReset.where({
        userId: protectedUser.id,
      }).first()
    )?.sendCount,
    2,
  );
  await invalid(await reset(protectedUser.email, initial.code));
  const wrong = replacement.code === '000000' ? '000001' : '000000';
  const failures = await Promise.all(
    Array.from({ length: 7 }, () => reset(protectedUser.email, wrong)),
  );
  assert.ok(failures.every((r) => r.status === 400));
  assert.equal(
    (
      await db.orm.public.PasswordReset.where({
        userId: protectedUser.id,
      }).first()
    )?.attempts,
    5,
  );
  await invalid(await reset(protectedUser.email, replacement.code));
  assert.equal(
    (await db.orm.public.User.where({ id: protectedUser.id }).first())
      ?.loginFailures,
    0,
  );
  assert.equal(
    (
      await processEmailOutbox(async () => {
        throw Error('exhausted code must not be sent');
      }, protectedUser.id)
    ).discarded,
    1,
  );
  await db.orm.public.PasswordReset.where({ userId: protectedUser.id }).update({
    sendCount: 5,
    resendAfter: '2000-01-01T00:00:00Z',
  });
  await passwordResetService.requestReset(protectedUser.email);
  assert.equal(
    (
      await db.orm.public.PasswordReset.where({
        userId: protectedUser.id,
      }).first()
    )?.sendCount,
    5,
  );
  await db.orm.public.PasswordReset.where({ userId: protectedUser.id }).update({
    windowStartedAt: '2000-01-01T00:00:00Z',
  });
  await passwordResetService.requestReset(protectedUser.email);
  const expired = await resetCode(protectedUser.id);
  assert.equal(
    (
      await db.orm.public.PasswordReset.where({
        userId: protectedUser.id,
      }).first()
    )?.sendCount,
    1,
  );
  await db.orm.public.PasswordReset.where({ userId: protectedUser.id }).update({
    expiresAt: '2000-01-01T00:00:00Z',
  });
  await invalid(await reset(protectedUser.email, expired.code));
  const suspended = await account('inactive');
  await passwordResetService.requestReset(suspended.email);
  const suspendedCode = await resetCode(suspended.id);
  await db.orm.public.User.where({ id: suspended.id }).update({
    isActive: false,
  });
  assert.deepEqual(
    await (await post('/forgot-password', { email: suspended.email })).json(),
    generic,
  );
  await invalid(await reset(suspended.email, suspendedCode.code));
  assert.equal(
    (await db.orm.public.User.where({ id: suspended.id }).first())?.isActive,
    false,
  );
});
