import { createAdminCatalogRouter } from './routes/adminCatalogRoutes.ts';
import {
  adminCatalogService,
  type AdminCatalogService,
} from './services/adminCatalogService.ts';
import { createAccountRouter } from './routes/accountRoutes.ts';
import {
  accountPaymentService,
  type AccountPaymentService,
} from './services/accountPaymentService.ts';
import { sendSuccess, sendFailure } from './utils/apiResponse.ts';
import { parsePaymobCheckoutEnv } from './config/paymob.ts';
import { createOperationRouter } from './routes/operationRoutes.ts';
import { requestLogger } from './middlewares/requestLogger.ts';
import {
  readinessService,
  type ReadinessService,
} from './services/readinessService.ts';
import { requestId } from './middlewares/requestId.ts';
import type { AdminPaymentStatisticsService } from './services/adminPaymentStatisticsService.ts';
import {
  adminStatisticsService,
  type AdminStatisticsService,
} from './services/adminStatisticsService.ts';
import { createAdminStatisticsRouter } from './routes/adminStatisticsRoutes.ts';
import type { TicketService } from './services/ticketService.ts';
import {
  adminPaymentService,
  type AdminPaymentService,
} from './services/adminPaymentService.ts';
import { createAdminPaymentRouter } from './routes/adminPaymentRoutes.ts';
import type { PaymentCheckoutService } from './services/paymentCheckoutService.ts';
import type { PaymentAttemptService } from './services/paymentAttemptService.ts';
import {
  paymobWebhookService,
  type PaymobWebhookService,
} from './services/paymobWebhookService.ts';
import { createPaymobWebhookRouter } from './routes/paymobWebhookRoutes.ts';
import {
  auditLogService,
  type AuditLogService,
} from './services/auditLogService.ts';
import { createAuditLogRouter } from './routes/auditLogRoutes.ts';
import {
  administratorService,
  type AdministratorService,
} from './services/administratorService.ts';
import { createAdministratorRouter } from './routes/administratorRoutes.ts';
import {
  adminUserService,
  type AdminUserService,
} from './services/adminUserService.ts';
import { createAdminUserRouter } from './routes/adminUserRoutes.ts';
import {
  adminBookingService,
  type AdminBookingService,
} from './services/adminBookingService.ts';
import { createAdminBookingRouter } from './routes/adminBookingRoutes.ts';
import type { TripBatchService } from './services/tripBatchService.ts';
import {
  busTypeService,
  type BusTypeService,
} from './services/busTypeService.ts';
import {
  amenityService,
  type AmenityService,
} from './services/amenityService.ts';
import { createBusTypeRouter } from './routes/busTypeRoutes.ts';
import { createAmenityRouter } from './routes/amenityRoutes.ts';
import {
  bookingService,
  type BookingService,
} from './services/bookingService.ts';
import { createBookingRouter } from './routes/bookingRoutes.ts';
import express from 'express';
import { requireAuth } from './middlewares/requireAuth.ts';
import { requireRole } from './middlewares/requireRole.ts';
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
import { busService, type BusService } from './services/busService.ts';
import { createBusRouter } from './routes/busRoutes.ts';

import { routeService, type RouteService } from './services/routeService.ts';
import { createRouteRouter } from './routes/routeRoutes.ts';

import { tripService, type TripService } from './services/tripService.ts';
import { createTripRouter } from './routes/tripRoutes.ts';

import type { TripSearchService } from './services/tripSearchService.ts';

import type { TripDetailsService } from './services/tripDetailsService.ts';

import { authService, type AuthService } from './services/authService.ts';
import { createAuthRouter } from './routes/authRoutes.ts';

import {
  sessionService,
  type SessionService,
} from './services/sessionService.ts';
import { createSessionRouter } from './routes/sessionRoutes.ts';

import {
  passwordResetService,
  type PasswordResetService,
} from './services/passwordResetService.ts';
import { createPasswordResetRouter } from './routes/passwordResetRoutes.ts';

export function createApp(
  corsOrigins: string[],
  services: {
    readiness?: ReadinessService;
    adminCatalog?: AdminCatalogService;
    cities?: CityService;
    stations?: StationService;
    buses?: BusService;
    routes?: RouteService;
    trips?: TripService;
    tripBatches?: TripBatchService;
    tripSearch?: TripSearchService;
    tripDetails?: TripDetailsService;
    auth?: AuthService;
    sessions?: SessionService;
    accountPayments?: AccountPaymentService;
    passwordReset?: PasswordResetService;
    bookings?: BookingService;
    tickets?: TicketService;
    adminBookings?: AdminBookingService;
    adminPayments?: AdminPaymentService;
    adminPaymentStatistics?: AdminPaymentStatisticsService;
    adminStatistics?: AdminStatisticsService;
    adminUsers?: AdminUserService;
    administrators?: AdministratorService;
    auditLogs?: AuditLogService;
    busTypes?: BusTypeService;
    amenities?: AmenityService;
    paymobWebhook?: PaymobWebhookService;
    paymentAttempts?: PaymentAttemptService;
    paymentCheckout?: PaymentCheckoutService;
  } = {},
) {
  const app = express();

  const admin = [
    requireAuth(services.sessions ?? sessionService),
    requireRole('ADMIN', 'SUPER_ADMIN'),
  ];

  const superAdmin = [
    requireAuth(services.sessions ?? sessionService),
    requireRole('SUPER_ADMIN'),
  ];

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

  app.get('/api/v1/ready', async (_request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    if (app.locals.stopping) {
      sendFailure(response, 503, 'SERVICE_UNAVAILABLE');
      return;
    }
    try {
      await (services.readiness ?? readinessService).check();
      sendSuccess(response, { status: 'ready' });
    } catch {
      sendFailure(response, 503, 'SERVICE_UNAVAILABLE');
    }
  });

  app.get('/api/v1/health', (_request, response) => {
    sendSuccess(response, { status: 'ok' });
  });

  app.use(
    '/api/v1/cities',
    createCityRouter(services.cities ?? cityService, admin),
  );
  app.use(
    '/api/v1/stations',
    createStationRouter(services.stations ?? stationService, admin),
  );

  app.use(
    '/api/v1/buses',
    createBusRouter(services.buses ?? busService, admin),
  );

  app.use(
    '/api/v1/routes',
    createRouteRouter(services.routes ?? routeService, admin),
  );

  app.use(
    '/api/v1/trips',
    createTripRouter(
      services.trips ?? tripService,
      admin,
      services.tripSearch,
      services.tripDetails,
      services.tripBatches,
    ),
  );

  app.use(
    '/api/v1/bus-types',
    createBusTypeRouter(services.busTypes ?? busTypeService, admin),
  );
  app.use(
    '/api/v1/amenities',
    createAmenityRouter(services.amenities ?? amenityService, admin),
  );

  app.use(
    '/api/v1/admin',
    createAdminCatalogRouter(
      services.adminCatalog ?? adminCatalogService,
      admin,
    ),
  );
  app.use('/api/v1/admin', createOperationRouter(superAdmin));

  // Public capability only; no keys, account ids, URLs or provider calls.
  app.get('/api/v1/payments/availability', (_request, response) => {
    let checkoutEnabled = false;
    try {
      checkoutEnabled = parsePaymobCheckoutEnv(process.env) !== null;
    } catch {
      /* Keep checkout closed for invalid settings. */
    }
    sendSuccess(response.set('Cache-Control', 'no-store'), { checkoutEnabled });
  });
  app.use(
    '/api/v1/account',
    createAccountRouter(
      services.accountPayments ?? accountPaymentService,
      services.sessions ?? sessionService,
    ),
  );
  app.use('/api/v1/auth', createAuthRouter(services.auth ?? authService));
  app.use(
    '/api/v1/auth',
    createSessionRouter(services.sessions ?? sessionService, corsOrigins),
  );

  app.use(
    '/api/v1/auth',
    createPasswordResetRouter(services.passwordReset ?? passwordResetService),
  );

  app.use(
    '/api/v1/bookings',
    createBookingRouter(
      services.bookings ?? bookingService,
      services.sessions ?? sessionService,
      services.paymentAttempts,
      services.paymentCheckout,
      services.tickets,
    ),
  );

  app.use(
    '/api/v1/admin/bookings',
    createAdminBookingRouter(
      services.adminBookings ?? adminBookingService,
      admin,
    ),
  );

  app.use(
    '/api/v1/admin/statistics',
    createAdminStatisticsRouter(
      services.adminStatistics ?? adminStatisticsService,
      admin,
    ),
  );

  app.use(
    '/api/v1/admin/payments',
    createAdminPaymentRouter(
      services.adminPayments ?? adminPaymentService,
      admin,
      services.adminPaymentStatistics,
    ),
  );

  app.use(
    '/api/v1/admin/users',
    createAdminUserRouter(services.adminUsers ?? adminUserService, admin),
  );

  app.use(
    '/api/v1/admin/admins',
    createAdministratorRouter(
      services.administrators ?? administratorService,
      superAdmin,
    ),
  );

  app.use(
    '/api/v1/admin/audit-logs',
    createAuditLogRouter(services.auditLogs ?? auditLogService, superAdmin),
  );

  app.use(
    '/api/v1/payments/paymob',
    createPaymobWebhookRouter(services.paymobWebhook ?? paymobWebhookService),
  );

  // This runs only if none of the routes above handled the request.
  app.use((_request, _response, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Route not found'));
  });

  // Error middleware must come after the routes and the not-found middleware.
  app.use(errorHandler);

  return app;
}
