import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { db } from '../../src/prisma/db.ts';
import {
  cleanupAuthData,
  authRetentionMs,
} from '../../src/services/authCleanupService.ts';
import { authService } from '../../src/services/authService.ts';
import { passwordResetService } from '../../src/services/passwordResetService.ts';
import { sessionService } from '../../src/services/sessionService.ts';
import {
  hashRefreshToken,
  newRefreshToken,
  signAccessToken,
} from '../../src/utils/sessionTokens.ts';
import {
  decryptVerificationCode,
  decryptPasswordResetCode,
  hashVerificationCode,
} from '../../src/utils/authCrypto.ts';

test('authentication cleanup preserves verification identity, throttles, valid sessions and refresh replay detection', async (t) => {
  t.after(() => db.close());
  const now = Date.now(),
    iso = (ms: number) => new Date(ms).toISOString();
  const empty = () => ({
    verificationCodesCleared: 0,
    resetCodesCleared: 0,
    mailCodesCleared: 0,
    expiredEmailsDeleted: 0,
    expiredSessionsDeleted: 0,
  });
  async function account(ct: TestContext, verified = false) {
    const user = await db.orm.public.User.create({
      name: 'Cleanup test',
      email: randomUUID() + '@example.test',
      phone: '+201012345678',
      passwordHash: 'private-fixture-hash',
      emailVerifiedAt: verified ? iso(now) : null,
    });
    ct.after(async () => {
      await db.orm.public.User.where({ id: user.id }).delete();
    });
    return user;
  }
  async function verification(userId: string, expiresAt = iso(now - 1)) {
    return db.orm.public.EmailVerification.create({
      userId,
      codeHash: hashVerificationCode(userId, '123456'),
      expiresAt,
      resendAfter: iso(now - 1),
      windowStartedAt: iso(now - 1800000),
      sendCount: 5,
    });
  }
  await t.test(
    'expired verification loses its hash but preserves id and resend limits; the same id can recover later',
    async (ct) => {
      const user = await account(ct),
        challenge = await verification(user.id);
      assert.deepEqual(await cleanupAuthData({ now }), {
        ...empty(),
        verificationCodesCleared: 1,
      });
      const cleared = (await db.orm.public.EmailVerification.where({
        id: challenge.id,
      }).first())!;
      assert.deepEqual(cleared, { ...challenge, codeHash: null });
      await authService.resendVerification({
        email: user.email,
        verificationId: challenge.id,
      });
      assert.equal(
        (await db.orm.public.EmailVerification.where({
          id: challenge.id,
        }).first())!.codeHash,
        null,
      );
      assert.equal(
        (await db.orm.public.EmailOutbox.where({ userId: user.id }).all())
          .length,
        0,
      );
      await assert.rejects(
        authService.verifyEmail({
          email: user.email,
          verificationId: challenge.id,
          code: '123456',
        }),
        { code: 'INVALID_VERIFICATION_CODE' },
      );
      await db.orm.public.EmailVerification.where({ id: challenge.id }).update({
        windowStartedAt: iso(now - 7200000),
      });
      await authService.resendVerification({
        email: user.email,
        verificationId: challenge.id,
      });
      const renewed = (await db.orm.public.EmailVerification.where({
        id: challenge.id,
      }).first())!;
      assert.ok(renewed.codeHash);
      assert.equal(renewed.sendCount, 1);
      const message = (await db.orm.public.EmailOutbox.where({
        userId: user.id,
      }).first())!;
      const code = decryptVerificationCode(user.id, message.encryptedCode!);
      assert.deepEqual(await cleanupAuthData({ now }), empty());
      await authService.verifyEmail({
        email: user.email,
        verificationId: challenge.id,
        code,
      });
      assert.ok(
        (await db.orm.public.User.where({ id: user.id }).first())!
          .emailVerifiedAt,
      );
    },
  );
  await t.test(
    'reset hash cleanup keeps hourly send limits and later reset requests still work',
    async (ct) => {
      const user = await account(ct, true);
      const challenge = await db.orm.public.PasswordReset.create({
        userId: user.id,
        codeHash: 'expired-reset-hash',
        expiresAt: iso(now),
        resendAfter: iso(now - 1),
        windowStartedAt: iso(now - 1800000),
        sendCount: 5,
      });
      assert.deepEqual(await cleanupAuthData({ now }), {
        ...empty(),
        resetCodesCleared: 1,
      });
      assert.deepEqual(
        await db.orm.public.PasswordReset.where({ id: challenge.id }).first(),
        { ...challenge, codeHash: null },
      );
      await passwordResetService.requestReset(user.email);
      assert.equal(
        (await db.orm.public.PasswordReset.where({ id: challenge.id }).first())!
          .codeHash,
        null,
      );
      await db.orm.public.PasswordReset.where({ id: challenge.id }).update({
        windowStartedAt: iso(now - 7200000),
      });
      await passwordResetService.requestReset(user.email);
      const renewed = (await db.orm.public.PasswordReset.where({
        id: challenge.id,
      }).first())!;
      assert.ok(renewed.codeHash);
      assert.equal(renewed.sendCount, 1);
      const message = (await db.orm.public.EmailOutbox.where({
        userId: user.id,
        purpose: 'PASSWORD_RESET',
      }).first())!;
      const code = decryptPasswordResetCode(user.id, message.encryptedCode!);
      await passwordResetService.resetPassword({
        email: user.email,
        code,
        newPassword: 'Replacement-password-2026',
        confirmPassword: 'Replacement-password-2026',
      });
      const consumed = (await db.orm.public.PasswordReset.where({
        id: challenge.id,
      }).first())!;
      assert.equal(consumed.codeHash, null);
      assert.ok(consumed.consumedAt);
      assert.deepEqual(await cleanupAuthData({ now }), empty());
    },
  );
  await t.test(
    'valid hashes and mail survive; expired ciphertext is cleared and old account mail alone is deleted',
    async (ct) => {
      const user = await account(ct);
      const challenge = await verification(user.id, iso(now + 600000));
      const reset = await db.orm.public.PasswordReset.create({
        userId: user.id,
        codeHash: 'valid-reset',
        expiresAt: iso(now + 600000),
        resendAfter: iso(now + 60000),
        windowStartedAt: iso(now),
      });
      const fresh = await db.orm.public.EmailOutbox.create({
        userId: user.id,
        encryptedCode: 'fresh-ciphertext',
        expiresAt: iso(now + 600000),
      });
      const recent = await db.orm.public.EmailOutbox.create({
        userId: user.id,
        encryptedCode: 'expired-ciphertext',
        expiresAt: iso(now),
      });
      const grace = await db.orm.public.EmailOutbox.create({
        userId: user.id,
        purpose: 'PASSWORD_CHANGED',
        expiresAt: iso(now - authRetentionMs + 1),
      });
      const old = await db.orm.public.EmailOutbox.create({
        userId: user.id,
        purpose: 'PASSWORD_CHANGED',
        expiresAt: iso(now - authRetentionMs),
      });
      assert.deepEqual(await cleanupAuthData({ now }), {
        ...empty(),
        mailCodesCleared: 1,
        expiredEmailsDeleted: 1,
      });
      assert.deepEqual(
        await db.orm.public.EmailVerification.where({
          id: challenge.id,
        }).first(),
        challenge,
      );
      assert.deepEqual(
        await db.orm.public.PasswordReset.where({ id: reset.id }).first(),
        reset,
      );
      assert.deepEqual(
        await db.orm.public.EmailOutbox.where({ id: fresh.id }).first(),
        fresh,
      );
      assert.equal(
        (await db.orm.public.EmailOutbox.where({ id: recent.id }).first())!
          .encryptedCode,
        null,
      );
      assert.ok(
        await db.orm.public.EmailOutbox.where({ id: grace.id }).first(),
      );
      assert.equal(
        await db.orm.public.EmailOutbox.where({ id: old.id }).first(),
        null,
      );
      assert.deepEqual(await cleanupAuthData({ now }), empty());
    },
  );
  await t.test(
    'only sessions beyond the grace period cascade their tokens; used tokens still detect replay',
    async (ct) => {
      const user = await account(ct, true);
      const expired = await db.orm.public.Session.create({
        userId: user.id,
        expiresAt: iso(now - authRetentionMs),
      });
      const grace = await db.orm.public.Session.create({
        userId: user.id,
        expiresAt: iso(now - authRetentionMs + 1),
      });
      const active = await db.orm.public.Session.create({
        userId: user.id,
        expiresAt: iso(now + authRetentionMs),
      });
      const revoked = await db.orm.public.Session.create({
        userId: user.id,
        expiresAt: iso(now + authRetentionMs),
        revokedAt: iso(now - 1000),
      });
      const old = newRefreshToken(),
        current = newRefreshToken();
      for (const session of [expired, grace, revoked])
        await db.orm.public.RefreshToken.create({
          sessionId: session.id,
          tokenHash: hashRefreshToken(newRefreshToken()),
          expiresAt: session.expiresAt,
        });
      const used = await db.orm.public.RefreshToken.create({
        sessionId: active.id,
        tokenHash: hashRefreshToken(old),
        expiresAt: active.expiresAt,
        usedAt: iso(now - 10000000),
      });
      await db.orm.public.RefreshToken.create({
        sessionId: active.id,
        tokenHash: hashRefreshToken(current),
        expiresAt: active.expiresAt,
      });
      const access = await signAccessToken(user.id, active.id);
      assert.deepEqual(await cleanupAuthData({ now }), {
        ...empty(),
        expiredSessionsDeleted: 1,
      });
      assert.equal(
        await db.orm.public.Session.where({ id: expired.id }).first(),
        null,
      );
      assert.equal(
        (
          await db.orm.public.RefreshToken.where({
            sessionId: expired.id,
          }).all()
        ).length,
        0,
      );
      for (const session of [grace, active, revoked])
        assert.ok(
          await db.orm.public.Session.where({ id: session.id }).first(),
        );
      assert.deepEqual(
        await db.orm.public.RefreshToken.where({ id: used.id }).first(),
        used,
      );
      assert.equal(
        (await sessionService.authenticateAccessToken(access)).user.id,
        user.id,
      );
      await assert.rejects(sessionService.refresh(old), {
        code: 'UNAUTHENTICATED',
      });
      assert.ok(
        (await db.orm.public.Session.where({ id: active.id }).first())!
          .revokedAt,
      );
      await assert.rejects(sessionService.refresh(current), {
        code: 'UNAUTHENTICATED',
      });
      await assert.rejects(sessionService.authenticateAccessToken(access), {
        code: 'UNAUTHENTICATED',
      });
    },
  );
  await t.test(
    'concurrent cleanup counts each scrub once and bounded batches make progress',
    async (ct) => {
      const first = await account(ct),
        second = await account(ct),
        third = await account(ct);
      for (const user of [first, second, third]) await verification(user.id);
      const batch = await cleanupAuthData({ now, limit: 1 });
      assert.equal(batch.verificationCodesCleared, 1);
      const results = await Promise.all([
        cleanupAuthData({ now, limit: 1 }),
        cleanupAuthData({ now, limit: 1 }),
        cleanupAuthData({ now, limit: 1 }),
      ]);
      assert.ok(
        results.reduce(
          (sum, result) => sum + result.verificationCodesCleared,
          0,
        ) <= 2,
      );
      await cleanupAuthData({ now });
      for (const user of [first, second, third])
        assert.equal(
          (await db.orm.public.EmailVerification.where({
            userId: user.id,
          }).first())!.codeHash,
          null,
        );
      assert.deepEqual(await cleanupAuthData({ now }), empty());
    },
  );
  await t.test(
    'a concurrent renewal under the account lock keeps its fresh code',
    async (ct) => {
      const user = await account(ct),
        challenge = await verification(user.id);
      let entered!: () => void, release!: () => void;
      const ready = new Promise<void>((resolve) => {
        entered = resolve;
      });
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const renewal = db.transaction(async (tx) => {
        await tx.execute(
          db.raw
            .sql`SELECT pg_advisory_xact_lock(hashtextextended(${user.email}, 0))`
            .affectedCount()
            .build(),
        );
        entered();
        await gate;
        await tx.orm.public.EmailVerification.where({
          id: challenge.id,
        }).update({ codeHash: 'renewed-hash', expiresAt: iso(now + 600000) });
      });
      await ready;
      const cleanup = cleanupAuthData({ now });
      release();
      await Promise.all([renewal, cleanup]);
      assert.equal(
        (await db.orm.public.EmailVerification.where({
          id: challenge.id,
        }).first())!.codeHash,
        'renewed-hash',
      );
    },
  );
});
