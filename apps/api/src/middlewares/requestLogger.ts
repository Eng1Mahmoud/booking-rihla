import { performance } from 'node:perf_hooks';
import type { RequestHandler } from 'express';

export const requestLogger: RequestHandler = (request, response, next) => {
  const started = performance.now();
  let logged = false;
  const write = (aborted: boolean) => {
    if (logged) return;
    logged = true;
    // Deliberately omit URL/query, bodies, headers, IP addresses and user data.
    console.log(
      JSON.stringify({
        event: 'http_request',
        requestId: response.locals.requestId,
        method: request.method,
        status: aborted ? 499 : response.statusCode,
        durationMs: Math.round(performance.now() - started),
        aborted,
      }),
    );
  };
  response.once('finish', () => write(false));
  response.once('close', () => write(!response.writableFinished));
  next();
};
