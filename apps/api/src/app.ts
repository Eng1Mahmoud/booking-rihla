// HTTP framework and security libraries
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

// Shared request and error middleware
import { requestId } from './middlewares/requestId.ts';
import { requestLogger } from './middlewares/requestLogger.ts';
import { errorHandler } from './middlewares/errorHandler.ts';

// Application errors
import { AppError } from './errors/AppError.ts';

// Internal scheduled jobs
import { scheduledJobRouter } from './features/operations/scheduledJobRoutes.ts';

// Catalog, fleet, and trip routers
import { cityRouter } from './features/cities/cityRoutes.ts';
import { stationRouter } from './features/stations/stationRoutes.ts';
import { busRouter } from './features/buses/busRoutes.ts';
import { routeRouter } from './features/routes/routeRoutes.ts';
import { tripRouter } from './features/trips/tripRoutes.ts';
import { busTypeRouter } from './features/fleet/busTypeRoutes.ts';
import { amenityRouter } from './features/amenities/amenityRoutes.ts';

// Administrative catalog and operation routers
import { adminBusRouter } from './features/fleet/adminBusRoutes.ts';
import { adminFleetRouter } from './features/fleet/adminFleetRoutes.ts';
import { adminCatalogRouter } from './features/catalog/adminCatalogRoutes.ts';
import { operationRouter } from './features/operations/operationRoutes.ts';

// Account, authentication, and booking routers
import { accountRouter } from './features/accounts/accountRoutes.ts';
import { authRouter } from './features/auth/authRoutes.ts';
import { createSessionRouter } from './features/auth/sessionRoutes.ts';
import { passwordResetRouter } from './features/auth/passwordResetRoutes.ts';
import { bookingRouter } from './features/bookings/bookingRoutes.ts';

// Administration and reporting routers
import { adminBookingRouter } from './features/bookings/adminBookingRoutes.ts';
import { ticketScanRouter } from './features/tickets/ticketScanRoutes.ts';
import { adminStatisticsRouter } from './features/reports/adminStatisticsRoutes.ts';
import { adminPaymentRouter } from './features/payments/adminPaymentRoutes.ts';
import { adminUserRouter } from './features/users/adminUserRoutes.ts';
import { administratorRouter } from './features/administrators/administratorRoutes.ts';

// Payment callback and assistant routers
import { paymobWebhookRouter } from './features/payments/paymobWebhookRoutes.ts';
import { assistantRouter } from './features/assistant/assistantRoutes.ts';

export function createApp() {
  // 1. Read the frontend origins used by CORS and session CSRF protection.
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim());

  if (
    process.env.NODE_ENV === 'production' &&
    corsOrigins.some((origin) => !origin.startsWith('https://'))
  )
    throw new Error('Production CORS origins must use HTTPS');

  // 2. Create the application and configure shared middleware.
  const app = express();

  app.disable('x-powered-by');
  app.use(requestId);
  app.use(requestLogger);
  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
      exposedHeaders: ['X-Request-ID'],
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  // 3. Internal scheduled jobs.
  app.use('/api/v1/internal/jobs', scheduledJobRouter);

  // 4. Catalog, fleet, and trip endpoints; routers enforce operation permissions.
  app.use('/api/v1/cities', cityRouter);
  app.use('/api/v1/stations', stationRouter);
  app.use('/api/v1/buses', busRouter);
  app.use('/api/v1/routes', routeRouter);
  app.use('/api/v1/trips', tripRouter);
  app.use('/api/v1/bus-types', busTypeRouter);
  app.use('/api/v1/amenities', amenityRouter);

  // 5. Administrative catalog and trip/refund operations.
  app.use('/api/v1/admin', adminBusRouter);
  app.use('/api/v1/admin', adminFleetRouter);
  app.use('/api/v1/admin', adminCatalogRouter);
  app.use('/api/v1/admin', operationRouter);

  // 6. Accounts, authentication, sessions, and passenger bookings.
  app.use('/api/v1/account', accountRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/auth', createSessionRouter(corsOrigins));
  app.use('/api/v1/auth', passwordResetRouter);
  app.use('/api/v1/bookings', bookingRouter);

  // 7. Staff and administrator management, scanning, and reporting.
  app.use('/api/v1/admin/bookings', adminBookingRouter);
  app.use('/api/v1/admin/tickets', ticketScanRouter);
  app.use('/api/v1/admin/statistics', adminStatisticsRouter);
  app.use('/api/v1/admin/payments', adminPaymentRouter);
  app.use('/api/v1/admin/users', adminUserRouter);
  app.use('/api/v1/admin/admins', administratorRouter);

  // 8. Payment provider callbacks and the passenger assistant.
  app.use('/api/v1/payments/paymob', paymobWebhookRouter);
  app.use('/api/v1/assistant', assistantRouter);

  // 9. Unmatched requests become 404 errors after every router has had a chance.
  app.use((_request, _response, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Route not found'));
  });

  // Error middleware must come after the routes and the not-found middleware.
  app.use(errorHandler);

  return app;
}
