import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/app.ts';
import { AppError } from '../../src/errors/AppError.ts';
import {
  sessionService,
  type SessionService,
} from '../../src/services/sessionService.ts';

// Catalog tests isolate catalog behavior; authorization has its own HTTP/DB suites.
const sessions: SessionService = {
  ...sessionService,
  async authenticateAccessToken(token) {
    if (token !== 'catalog-test-admin')
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    return {
      sessionId: randomUUID(),
      user: {
        id: randomUUID(),
        name: 'Catalog test admin',
        email: 'catalog@example.test',
        phone: '+201012345678',
        role: 'ADMIN',
        language: 'en',
        emailVerifiedAt: '2026-01-01T00:00:00Z',
        createdAt: '2026-01-01T00:00:00Z',
      },
    };
  },
};
export function createCatalogApp(
  origins: string[],
  services: Parameters<typeof createApp>[1] = {},
) {
  return createApp(origins, { ...services, sessions });
}
export const adminFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  headers.set('Authorization', 'Bearer catalog-test-admin');
  return fetch(input, { ...init, headers });
};
