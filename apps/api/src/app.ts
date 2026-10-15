import express from 'express';

export const app = express();

app.disable('x-powered-by');

app.get('/api/v1/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use((_request, response) => {
  response.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});
