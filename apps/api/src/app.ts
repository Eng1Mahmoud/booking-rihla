import express from 'express';
import { AppError } from './common/errors/app-error.ts';
import { errorHandler } from './common/middleware/error-handler.ts';

export const app = express();

app.disable('x-powered-by');

app.get('/api/v1/health', (_request, response) => {
  response.json({ status: 'ok' });
});

// This runs only if none of the routes above handled the request.
app.use((_request, _response, next) => {
  next(new AppError(404, 'NOT_FOUND', 'Route not found'));
});

// Error middleware must come after the routes and the not-found middleware.
app.use(errorHandler);
