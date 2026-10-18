import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

export const requestId: RequestHandler = (_request, response, next) => {
  // Generate our own identifier rather than trusting a caller-supplied value.
  const id = randomUUID();
  response.locals.requestId = id;
  response.setHeader('X-Request-ID', id);
  next();
};
