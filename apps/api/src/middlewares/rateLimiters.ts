import type { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../errors/AppError.ts';
import { assistantRateLimit } from '../features/assistant/assistantService.ts';
import {
  clientRateLimitKey,
  userRateLimitKey,
} from '../utils/clientIdentity.ts';

const minute = 60_000;
const hour = 60 * minute;

function createLimiter(
  limit: number,
  windowMs: number,
  keyGenerator: (
    request: Request,
    response: Response,
  ) => string = clientRateLimitKey,
) {
  return rateLimit({
    limit,
    windowMs,
    keyGenerator,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_request, _response, next) =>
      next(
        new AppError(429, 'RATE_LIMITED', 'Too many requests; try again later'),
      ),
  });
}

// Authentication endpoints keep separate counters for each operation.
export const registrationLimiter = createLimiter(10, hour);
export const emailVerificationLimiter = createLimiter(30, 15 * minute);
export const resendVerificationLimiter = createLimiter(20, hour);
export const forgotPasswordLimiter = createLimiter(10, 15 * minute);
export const resetPasswordLimiter = createLimiter(20, 15 * minute);
export const loginLimiter = createLimiter(20, 15 * minute);
export const sessionRefreshLimiter = createLimiter(60, 15 * minute);
export const logoutLimiter = createLimiter(60, 15 * minute);
export const logoutAllLimiter = createLimiter(20, 15 * minute);
export const profileUpdateLimiter = createLimiter(20, minute, userRateLimitKey);

// These limits run after authentication and count requests per account.
export const bookingLimiter = createLimiter(20, minute, userRateLimitKey);
export const paymentAttemptLimiter = createLimiter(
  20,
  minute,
  userRateLimitKey,
);
export const paymentAttemptStatusLimiter = createLimiter(
  120,
  minute,
  userRateLimitKey,
);
export const paymentRefreshLimiter = createLimiter(6, minute, userRateLimitKey);
export const checkoutLimiter = createLimiter(20, minute, userRateLimitKey);
export const paymentStatusLimiter = createLimiter(
  120,
  minute,
  userRateLimitKey,
);
export const ticketDownloadLimiter = createLimiter(
  60,
  minute,
  userRateLimitKey,
);
export const operationLimiter = createLimiter(30, minute, userRateLimitKey);
export const adminPaymentStatisticsLimiter = createLimiter(
  60,
  minute,
  userRateLimitKey,
);
export const adminStatisticsLimiter = createLimiter(
  60,
  minute,
  userRateLimitKey,
);
export const ticketScanLimiter = createLimiter(120, minute, userRateLimitKey);

// Keep the assistant's existing rate-limit response and configured threshold.
export const assistantLimiter = rateLimit({
  windowMs: minute,
  limit: assistantRateLimit,
  keyGenerator: clientRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'AI_RATE_LIMIT',
    message: 'Too many assistant requests. Try again shortly.',
  },
});
