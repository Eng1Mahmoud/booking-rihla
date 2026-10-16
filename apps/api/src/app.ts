import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { AppError } from './errors/AppError.ts';
import { errorHandler } from './middlewares/errorHandler.ts';
import { createCityRouter } from './routes/cityRoutes.ts';
import { cityService, type CityService } from './services/cityService.ts';
import {
  stationService,
  type StationService,
} from './services/stationService.ts';
import { createStationRouter } from './routes/stationRoutes.ts';

export function createApp(
  corsOrigins: string[],
  services: { cities?: CityService; stations?: StationService } = {},
) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: corsOrigins }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/v1/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use('/api/v1/cities', createCityRouter(services.cities ?? cityService));
  app.use(
    '/api/v1/stations',
    createStationRouter(services.stations ?? stationService),
  );

  // This runs only if none of the routes above handled the request.
  app.use((_request, _response, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Route not found'));
  });

  // Error middleware must come after the routes and the not-found middleware.
  app.use(errorHandler);

  return app;
}
