# Bus Booking Platform — Implementation Roadmap

Status: Registration and email activation are bound to the originating verification id. Verified active accounts can sign in with short-lived JWT access tokens and rotating HttpOnly refresh cookies. Durable login lockout, session revocation/replay detection, current-user and device/all-device logout APIs, CSRF/origin checks and credentialed CORS are tested. Password recovery, single-use codes, session revocation and password-change notices are complete. USER, ADMIN and SUPER_ADMIN roles now protect catalog management using current database roles. A local command bootstraps the first verified super admin. The reservation MVP is implemented with transactional seats, server-calculated totals, ownership and live availability. Passenger cancellation is disabled. Bus types and amenities are implemented with protected CRUD, atomic assignments and reservation safeguards. Simple fixed seat templates replace editable physical grids; bus capacity/template changes are blocked after a trip uses the bus. Finite batch trip preview and atomic creation are complete. Administrator booking lists/details are complete with exact filters, safe customer summaries and preserved passenger ownership. Passenger account lists/details and suspension/activation with durable session revocation are complete. Super-admin administrator management is complete with session revocation, actor revalidation and last-active-super-admin protection. Administrator audit logging is complete; expiring ten-minute checkout holds are complete; the Paymob TEST provider adapter and signed callback verification are implemented; payment persistence, reconciliation, reference recovery and gated owned checkout/status APIs are complete. TEST merchant verification and policy agreement remain before activation; administrator payment management and tickets are next.

## How we will build

Build in focused feature batches. Combine related models, migrations, endpoints, validation, tests, and usage notes in one commit. Explain the outcome after the batch and go deeper on requested code. Do not pause after every small subtask; keep moving toward the MVP. Use a simple Route -> Controller -> Service -> Prisma structure with consistent naming; avoid a separate repository layer for now. The owner authorizes committing and pushing each completed feature after its checks; finish and publish it before starting the next feature. Production publication and real-money operations still need explicit approval. A phase is complete only when its working result can be demonstrated.

This root roadmap is the project's planning document and defines the implementation order. Detailed code explanations are provided in the chat rather than a docs folder. Its initial assumptions are one bus operator, account-based booking, Arabic as the default language, English support, and a fixed numbered seat layout. These are proposed defaults, not settled business decisions. Confirmed owner decision: passengers cannot cancel bookings; no passenger cancellation endpoint or frontend action is planned. Operator cancellation and refunds require a separate policy decision.

### Milestones

- **Trip browsing API — phase 3:** search and retrieve seeded trips through tested endpoints.
- **Reservation backend MVP — phase 6:** verified accounts can search and reserve seats through the API. No money is collected.
- **Complete backend — phase 10:** accounts, catalog, reservations, operator APIs, sandbox payments, tickets, notifications, and refunds pass their API checks.
- **Passenger website — phase 11:** connect all passenger flows to the completed backend.
- **Dashboard — phase 12:** connect all administration flows after the passenger website.
- **Production release — phase 14:** production payment provider, operational checks, and deployment are ready.

Security, validation, and meaningful tests are added with each relevant feature. The final review does not replace them.

## Phase 0 — Project agreement and Git foundation

Small steps:

- [x] Keep the project phases and feature plan in this root roadmap.
- [ ] Confirm the learning MVP boundaries and document assumptions.
- [x] Add a concise project README, this roadmap, and `.gitignore`.
- [x] Check the repository's existing history and default branch before making Git changes.
- [x] Document how to run and verify each implemented step.

Working result: an understandable project starting point with no generated application features.

## Phase 1 — Small backend foundation

Small steps:

- [x] Set up workspaces and `apps/api` only; add other apps and packages when needed.
- [x] Add Node.js, Express, TypeScript strict mode, and development scripts.
- [x] Add `GET /api/v1/health`.
- [x] Add typed environment validation and `.env.example`.
- [x] Add a consistent error response and centralized error handler.
- [ ] Add request IDs and structured logging — deferred until a later learning milestone.
- [x] Add ESLint for API source and tests.
- [x] Add Prettier formatting.
- [x] Add a minimal automated health check.
- [x] Add API security headers with Helmet.
- [x] Add JSON request parsing and a 100kb body limit with safe 400/413 errors.
- [x] Add explicit CORS configuration with validated origins and preflight handling.

Working result: start the API locally and receive a healthy response; configuration errors are understandable.

## Phase 2 — Database and sample trips

Small steps:

- [x] Run PostgreSQL locally with Docker Compose and a persistent volume.
- [x] Initialize Prisma 8 and adapt local connection settings and tooling.
- [x] Replace the starter contract with City and regenerate its artifacts.
- [x] Initialize the City table and retain the db reference and contract snapshot.
- [x] Add a small TypeScript example that creates or reuses Cairo and reads cities.
- [x] Add the City baseline migration and verify fresh-database recreation.
- [x] Complete City create/list/detail/update/delete endpoints, validation, pagination, and HTTP/PostgreSQL tests.
- [x] Apply the Prisma 8 change/migration workflow when adding Station.
- [x] Add cities and stations, including Arabic and English names and multiple stations per city.
- [x] Add Bus/BusSeat models, complete Bus CRUD, seat listing, and atomic capacity resizing.
- [x] Add Route with distinct endpoints, directed uniqueness, duration bounds, complete CRUD, filters, and tests.
- [x] Add Trip with complete CRUD, route/bus/status filtering, scheduling validation, and tests.
- [x] Add BusType/Amenity catalogs, bilingual labels and atomic bus assignments.
- [x] Choose fixed per-bus seat template codes; physical positions are rendered from code in the later frontend.
- [x] Add insert-only repeatable demo seed data for cities, stations, buses/seats, routes, and three days of trips.
- [x] Add database constraints for distinct route endpoints and valid estimated duration.
- [x] Add constraints for valid trip times and nonnegative integer-piastre prices.
- [x] Store money as integer piastres and trip times as PostgreSQL timestamptz; return UTC ISO strings.
- [x] Define Cairo date-search boundaries with Africa/Cairo calendar days, including 23/25-hour DST days.

Working result: a fresh database can be recreated using committed migrations and the seed command.

## Phase 3 — Trip browsing API

Feature batches:

- [x] Complete City CRUD and paginated listing.
- [x] Complete Station CRUD, its City relation, validation, constraints, and tests.
- [x] Complete basic Bus CRUD, numbered seats, active filtering, plate uniqueness, and concurrency/rollback tests.
- [x] Extend fleet metadata with bus types and amenities in management and passenger trip responses.
- [x] Expose a fixed seat template code and departure-specific availability to the later frontend.
- [x] Complete Route management APIs.
- [x] Complete Trip management, scheduled/cancelled status, overlap prevention, catalog safeguards, and tests.
- [x] Add repeatable demo seed data for realistic searches.
- [x] Add trip search by origin city/station, destination city/station, and travel date.
- [x] Add passenger trip details and ordered departure seat availability endpoints; availability now excludes per-trip BookingSeat allocations.
- [x] Add pagination for lists, strict request validation, relevant indexes, and empty/error cases for the implemented browsing endpoints.

Working result achieved for the basic fleet: tested catalog, search, passenger detail, and seat-list APIs. Bus types and amenities are implemented; simple fixed seat templates and trip guards are implemented; reservation allocations and passenger ownership are now implemented.

## Phase 4 — Accounts and email verification

Small steps:

- [x] Add users and HMAC-hashed, expiring, single-use verification codes.
- [x] Add registration with name, normalized email, international phone, language, and an Argon2id password hash.
- [x] Add loopback-bound Mailpit and SMTP delivery for local email testing.
- [x] Add email verification using a six-digit code and atomic verified-at state.
- [x] Require verified email and an active account for sign-in and authenticated requests.
- [x] Add resend cooldowns, durable per-account hourly limits, five-attempt code limits, and process-local IP rate limits.
- [x] Add an encrypted transactional email outbox and a bounded retrying worker with concurrent-worker locks.
- [x] Add Arabic and English verification templates.
- [x] Use generic registration/resend responses and safe verification errors.

Working result achieved: register, receive a code in Mailpit through SMTP, and activate the account. Verified-account sign-in and session enforcement are now implemented in phase 5.

## Phase 5 — Secure sign-in and account recovery

Small steps:

- [x] Bind activation and resend to the verificationId returned only for the originating registration; duplicate registration returns a decoy id.
- [x] Add login, a 15-minute JWT access token, and a rotating HttpOnly refresh cookie with a 30-day absolute session limit.
- [x] Store SHA-256 refresh-token hashes; detect reuse and revoke the affected session/token family.
- [x] Add current-user lookup, reusable authentication middleware, current-device logout and logout-all with immediate access-token revocation checks.
- [x] Add durable five-attempt/15-minute login lockout and process-local session endpoint IP limits.
- [ ] Move IP limits to a shared store when deploying multiple instances.
- [x] Add forgot-password and reset-password codes; revoke all sessions after a reset.
- [x] Add USER, ADMIN and SUPER_ADMIN roles, protected catalog management, current-role enforcement and a safe first-super-admin command.
- [x] Add reservation ownership checks with bookings in phase 6.
- [x] Verify HttpOnly/Secure/SameSite cookies, credentialed exact-origin CORS, custom-header/origin CSRF checks and HTTP failure cases.
- [ ] Exercise browser cookie/session flows when the actual frontend and deployment hostnames are available.

Working result: complete account lifecycle with tested session rotation and access restrictions.

## Phase 6 — Reservation MVP

Small steps:

- [x] Add Booking/BookingSeat with RESERVED status; introduce payment states only with the later payment feature.
- [x] Expose availability and reservation APIs needed by the later seat picker.
- [x] Add passenger details and server-calculated totals.
- [x] Create reservations transactionally and prevent duplicate active seat allocations using a database constraint.
- [x] Test two concurrent requests for the same seat; only one succeeds.
- [x] Return a booking reference and confirmation data through the API.
- [x] Add my bookings and booking details with ownership checks.
- [x] Enforce no passenger cancellation: expose no cancellation, DELETE or PATCH booking endpoint.
- [x] Clearly label this local flow as a reservation without payment; do not imply a paid ticket.

Working result achieved: verified users reserve available seats and view only their own reservations. Passenger cancellation is unavailable; reservations do not expire or collect payment.

**Learning MVP complete.** Review the entire flow and explain the data model before expanding it.

## Phase 7 — Operator management APIs

Small steps:

- [x] Protect current catalog management endpoints with administrator roles and test access restrictions.
- [x] Add city and station management.
- [x] Add bus type, amenity, bus and plate-number management with reservation safeguards.
- [x] Choose a fixed seat template through existing bus management; preserve physical seat ids.
- [x] Add route and single-trip management, including prices and times.
- [x] Preserve bus seat capacity/identities and reject changes or deletion of trips with reservations.
- [x] Prevent changing the bus seat template or capacity once any trip uses it.
- [x] Add finite batch trip creation with Cairo dates/weekdays, conflict preview and atomic confirmation.
- [x] Add protected administrator booking summaries/details, exact filters, Cairo travel-day boundaries and pagination.
- [x] Add passenger account lists/details and suspend/activate controls with protected staff accounts and permanent revocation of existing sessions.
- [x] Add super-admin-only administrator listing, role assignment and suspension, with protected last-active-super-admin and stale-actor guards.
- [x] Record admin mutations atomically with allowlisted snapshots and expose super-admin-only filtered audit queries.

Working result: authorized operators manage the data previously supplied by seeds.

## Phase 8 — Seat holds and sandbox payments

Confirmed technical direction: use Paymob in EGP, initially TEST cards with Auth/Cap only. The owner now has a Paymob account and local TEST credentials; API-key authentication succeeded without creating a payment. A local payment:setup check supports preparation without an existing transaction or owner id. The adapter is implemented and tested with deterministic transport fixtures; account activation, exact Auth request fields and remote behavior remain unverified. An opt-in webhook listener now persists signature-valid, integration-scoped events without changing bookings. Owned preparation endpoints now persist one server-priced, idempotent PaymentAttempt per hold without contacting Paymob. An internal send-once authorization creation service now persists an operation before provider I/O, records verified intention/order references and encrypts checkout URLs. The creation service returns operation metadata only; a separately gated, owned checkout endpoint now controls link exposure. Known-order, original-authorization inquiry and durable capture/void reconciliation are now implemented internally with an opt-in TEST worker. A captured booking becomes CONFIRMED only after authenticated inquiry verifies the exact full amount. PAYMENT_PROCESSING keeps seats past the original hold deadline while capture is unresolved. Authenticated reference recovery, missing-callback fallback and owned checkout/status endpoints are implemented; checkout remains disabled until TEST account verification and policy agreement. A timeout is an unknown outcome; never repeat a capture blindly or release a seat while its capture outcome is unknown. Operator cancellation/refund policy still needs agreement before paid-booking activation.

Small steps:

- [x] Use a ten-minute hold capped at departure; passenger cancellation remains disabled.
- [ ] Agree on operator cancellation/refund rules before implementing paid bookings.
- [x] Replace immediate reservation confirmation with pending payment and a default ten-minute hold.
- [x] Expose hold expiry times; add lazy expiry and an optional cleanup worker preserving history.
- [x] Enforce active-seat uniqueness with a partial index while retaining expired seat snapshots.
- [x] Implement durable internal payment/booking transitions: late authorization is voided; once capture starts, retain seat allocation until the outcome is reconciled.
- [x] Add a PaymentProvider interface, Paymob TEST adapter for EGP, strict configuration, HMAC verification and transport tests.
- [x] Create a Paymob account and add local TEST credentials; verify API-key authentication without payment.
- [ ] Verify card Auth/Cap capability and actual payloads before connecting paid bookings.
- [x] Persist server-driven capture/void intent with exact server-calculated amounts and one-send ownership.
- [x] Expose owned checkout initiation/result endpoints behind an explicit disabled-by-default TEST flag; keep capture/void server-only.
- [x] Persist signed webhook receipts with atomic deduplication, configured integration/currency checks and optional initial owner filtering; no booking mutations.
- [x] Persist an owned, server-priced payment preparation snapshot with expiry and idempotent create/read endpoints, transaction guards and one-per-booking uniqueness.
- [x] Persist authorization creation intent before provider I/O, prevent duplicate sends across service instances, attach provider references and encrypt checkout URLs; test late responses without exposing checkout.
- [x] Reconcile known orders/original authorization transactions through authenticated inquiry matching TEST mode, owner, integration, transaction, order, currency and amount.
- [x] Recover uncertain authorization creation without stored order references, and test fallback behavior when the original authorization callback is missing.
- [x] Use fresh inquiry rather than callback ordering; persist and deduplicate capture/void claims across workers and process restarts.
- [x] Confirm only exact, successful full capture for an already-processing booking; void uncollected late authorization and isolate inconsistent/partial capture for review.
- [x] Expose owned checkout/payment-result data without accepting browser-supplied payment outcomes.
- [ ] Add administrator payment lists/details with provider references and review states.
- [x] Test expiry boundaries, concurrent holds, reallocation/cleanup races, history preservation and departure caps.
- [x] Test duplicate callbacks, concurrent workers, stale inquiry, timeout/crash recovery, seat expiry/reallocation, late void and invalid payment scope.

Working result: complete a sandbox payment and obtain exactly one confirmed booking with correct seat allocation.

## Phase 9 — Tickets, notifications, cancellations, and refunds

Small steps:

- [ ] Add in-app and emailed tickets with booking references and QR codes.
- [ ] Add booking confirmation and payment receipt emails.
- [ ] Apply the agreed operator cancellation/refund policy; keep passenger cancellation unavailable.
- [ ] Persist refund records; implement provider refunds, retries, and reconciliation without double refunds.
- [ ] Restrict refund issuance to super admins as described in the role requirements.
- [ ] Add trip cancellation, affected-passenger notifications, and appropriate refund processing.
- [ ] Add cancellation, trip cancellation, and refund emails in Arabic and English.
- [ ] Add departure reminders for trips departing in 24 hours, without duplicate reminders.
- [ ] Add scheduled cleanup of expired codes and old refresh tokens.
- [ ] Use Redis/BullMQ for queued work as required; preserve the transactional email outbox.

Working result: a paid sandbox booking supports the full ticket, notification, cancellation, and refund lifecycle.

## Phase 10 — Backend completion gate

Complete this before creating apps/web or apps/admin:

- [ ] Verify every agreed backend feature has models/migrations, endpoints, validation, errors, authorization where relevant, tests, and API usage notes.
- [ ] Verify pricing, booking status transitions, ownership, session rotation, seat concurrency, and payment/refund idempotency.
- [ ] Verify fresh database setup, seeds, indexes, pagination, readiness, logs, and background workers.
- [ ] Confirm email/ticket/notification APIs and Arabic/English templates.
- [ ] Expose defined dashboard booking/payment/upcoming-trip/occupancy metrics once their status semantics are finalized.
- [ ] Add backend CI checks and document deployment/API configuration for frontend work.
- [ ] Resolve outstanding backend defects and push the completed feature commits.

Working result: the agreed backend scope works through HTTP and repeatable tests, ready for frontend integration. Production provider onboarding remains part of release preparation.

## Phase 11 — Passenger website

Feature batches, each completed and pushed before the next:

- [ ] Create apps/web with Next.js, an API client, and shared Zod schemas where needed.
- [ ] Add mobile layouts, Arabic default, English coverage, RTL logical spacing, light/dark themes, and consistent shadcn/ui components.
- [ ] Add search, results, trip details and accessible physical seat selection using code-defined templates and numbered seats; preserve the physical LTR grid in Arabic and submit seatId, with loading/empty/error states.
- [ ] Add registration, verification/resend, login, session restoration, account, and password recovery using react-hook-form and Zod.
- [ ] Add passenger details, server-priced summaries, reservations, booking references, and confirmation.
- [ ] Add checkout, hold countdown/expiry, and payment success/failure/cancellation handling.
- [ ] Add ticket/QR views, upcoming/past/operator-cancelled bookings and details; expose no passenger cancellation action.
- [ ] Introduce TanStack Query for server data and Zustand only for client state that needs it.
- [ ] Check keyboard operation, focus, screen-reader labels, contrast, responsive layouts, and full Arabic/English flows.

Working result: the passenger website uses the completed backend end to end. Begin the dashboard afterward.

## Phase 12 — Administration dashboard

Feature batches:

- [ ] Create apps/admin with protected administrator access and shared schemas/components where useful.
- [ ] Add complete city/station management screens.
- [ ] Add bus types, amenities, fixed template selection, buses, plates, routes, and trip management screens.
- [ ] Add recurring/bulk trip creation with a review of generated departures and backend reservation safeguards.
- [ ] Add filtered bookings, details, payments, provider references, permitted refunds, and trip cancellation controls.
- [ ] Add user lists, suspension/activation, super-admin-only administrator management, and audit viewing.
- [ ] Add precisely defined booking/revenue/upcoming-trip/occupancy metrics.
- [ ] Complete Arabic/English, RTL, themes, accessibility, responsive behavior, and role-specific failure states.

Working result: operators manage the platform through the completed backend with tested role restrictions.

## Phase 13 — Release verification and reliability

Small steps:

- [ ] Complete service tests for pricing, code verification, session rotation, and booking transitions.
- [ ] Complete real-PostgreSQL integration tests for constraints, concurrency, and payment/refund idempotency.
- [ ] Add Playwright coverage for registration, verification, search, seats, payment, and tickets.
- [ ] Review authorization bypass, booking ownership, rate limits, and sensitive error/log output.
- [ ] Review indexes, pagination, retry behavior, health/readiness checks, and worker failures.
- [ ] Add CI for linting, type checks, relevant tests, and dependency auditing.
- [ ] Write environment setup, architecture, deployment, backup, restore, and troubleshooting instructions.

Working result: the critical user flows and failure cases pass repeatable checks in CI.

## Phase 14 — Production payments and deployment

Small steps:

- [ ] Verify current provider availability and merchant requirements; select an Egyptian payment provider.
- [ ] Implement the chosen provider through PaymentProvider and verify its supported methods, webhooks, and refunds.
- [ ] Keep PayPal sandbox as a development/test option where useful.
- [ ] Add production multi-stage Docker builds, non-root containers, health checks, and `.dockerignore`.
- [ ] Separate development and production Compose configuration; keep database and Redis private.
- [ ] Configure HTTPS, production secrets, secure cookies, explicit CORS, SMTP, and worker execution.
- [ ] Use production migration deployment, durable volumes, backups, and a tested restore process.
- [ ] Configure monitoring and logs, payment reconciliation, and incident/rollback procedures.
- [ ] Rehearse deployment in staging and run a controlled end-to-end production smoke test.
- [ ] Obtain explicit approval before production publication or real-money operations.

Working result: the application is ready for a controlled commercial launch.

## Later product expansions

These follow the complete initial release; each receives its own scope and implementation plan:

- [ ] Promo codes and discounts.
- [ ] WhatsApp and SMS notifications.
- [ ] Driver/conductor QR check-in application.
- [ ] Round-trip bookings and multi-stop routes.
- [ ] Loyalty points.
- [ ] Multiple bus operators and tenant isolation.
- [ ] Reviews and ratings.
- [ ] Dynamic pricing.
- [ ] Analytics and reporting exports.

## Decisions to settle before their dependent work

| Decision                   | Proposed starting point                                    | Decide before              |
| -------------------------- | ---------------------------------------------------------- | -------------------------- |
| Operator model             | One operator; multi-tenant later                           | Phase 2                    |
| Guest checkout             | Accounts required                                          | Phase 4                    |
| Seat layout                | Simple numbered seats first                                | Phase 2; extend in phase 7 |
| Hold duration              | Ten minutes, capped at departure                           | Phase 8                    |
| Cancellation/refund policy | No assumed percentages                                     | Phase 8                    |
| Production provider        | Evaluate actual merchant eligibility and supported methods | Phase 14                   |

## Completion and Git workflow for every feature

1. Define the feature boundaries and finish its backend behavior together: model, migrations, endpoints, validation, errors, relevant authorization, tests, and usage notes.
2. Keep the implementation simple and consistent with Route -> Controller -> Service -> Prisma.
3. Run the feature, exercise normal and failure cases, and verify meaningful database behavior.
4. Explain the completed result and important code; expand explanations where requested.
5. Review the diff, exclude local secrets/build output, and create a focused Conventional Commit. Prisma 8 contract artifacts and migrations stay in Git.
6. Push the completed feature under the owner's standing authorization, then begin the next feature.
7. Finish the backend first; build the passenger website next and the dashboard afterward.

Use short feature branches as appropriate, keep the main branch working, and avoid combining unrelated features in one commit. Example commit subjects:

```text
chore(repo): document implementation roadmap
chore(api): initialize TypeScript workspace
feat(api): add health endpoint
feat(database): add cities and stations
feat(trips): add date-based search
feat(web): display trip search results
fix(bookings): prevent concurrent seat reservations
```

The roadmap follows complete feature batches: finish, verify, explain, commit, and push before moving on. Backend first, then passenger website, then dashboard. City, Station, basic Bus/seat management, Route management, and Trip management are complete; repeatable seed data and passenger trip search are complete; passenger trip details and departure seat listing are complete; registration and email verification are complete; secure sign-in, rotating sessions and password recovery are complete; administrator roles and management API protection are complete; the reservation MVP without payment or passenger cancellation is complete; bus types and amenities are complete; simple fixed seat templates and trip guards are complete; finite batch trip preview and atomic creation are complete; administrator booking lists/details are complete; passenger account management with session revocation is complete; super-admin administrator management is complete; audit logging, expiring seat holds, the Paymob TEST adapter and durable signed webhook receipt are complete; owned payment-attempt preparation is complete; durable internal authorization creation is complete; known-order inquiry and the internal capture/void booking lifecycle are complete; authenticated reference recovery and missing-callback fallback are complete; owned checkout/status endpoints are complete behind a disabled-by-default TEST gate; account verification and operator cancellation/refund policy remain before paid activation.

Payment reference recovery is implemented in the existing opt-in worker: UNKNOWN/stale REQUESTING operations are queried by their exact operation UUID, validated against account/TEST/EGP/amount, and correlated without resending creation. Known orders without an original authorization receipt can use the same authenticated lookup. Its latest-transaction limitation does not permit guessing parent IDs or reconstructing lost checkout links. The migration only widens the reference-pair check to allow a recovered order ID without an intention ID; READY still requires a verified intention and encrypted checkout. Owned checkout/status endpoints are implemented; merchant verification and policy agreement remain required before activation.
