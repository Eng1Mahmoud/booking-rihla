# Bus Booking Platform — Implementation Roadmap

Status: Backend implementation is ready for local passenger-site/dashboard integration. Operator cancellation/full-refund policy is approved and implemented with durable notices, guarded TEST refund issuance/inquiry, request logs, PostgreSQL readiness and graceful shutdown. Actual Paymob merchant Auth/Capture/refund verification remains external and disabled. Automated tests and GitHub Actions billing troubleshooting are deferred by the owner.

## How we will build

Build in focused feature batches. Combine related models, migrations, endpoints, validation, tests, and usage notes in one commit. Explain the outcome after the batch and go deeper on requested code. Do not pause after every small subtask; keep moving toward the MVP. Use a simple Route -> Controller -> Service -> Prisma structure with consistent naming; avoid a separate repository layer for now. The owner authorizes committing and pushing each completed feature after its checks; finish and publish it before starting the next feature. Production publication and real-money operations still need explicit approval. A phase is complete only when its working result can be demonstrated.

This root roadmap is the project's planning document and defines the implementation order. Detailed code explanations are provided in the chat rather than a docs folder. Its initial assumptions are one bus operator, account-based booking, Arabic as the default language, English support, and a fixed numbered seat layout. These are proposed defaults, not settled business decisions. Confirmed owner decision: passengers cannot cancel bookings; no passenger cancellation endpoint or frontend action is planned. Approved on 2026-10-18: company cancellation requires a full refund; only Super Admin may issue it. Passengers cannot cancel.

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
- [x] Agree on operator cancellation/refund rules before implementing paid bookings.
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
- [x] Add administrator payment lists/details with exact filters, provider references and review states; no financial mutation endpoints.
- [x] Test expiry boundaries, concurrent holds, reallocation/cleanup races, history preservation and departure caps.
- [x] Test duplicate callbacks, concurrent workers, stale inquiry, timeout/crash recovery, seat expiry/reallocation, late void and invalid payment scope.

Working result: complete a sandbox payment and obtain exactly one confirmed booking with correct seat allocation.

## Phase 9 — Tickets, notifications, cancellations, and refunds

Small steps:

- [x] Add in-app and emailed tickets with booking references and QR codes.
- [x] Add booking confirmation and payment receipt emails (combined with the ticket: reference and paid amount; not a tax invoice).
- [x] Apply the agreed operator cancellation/refund policy; keep passenger cancellation unavailable.
- [x] Persist refund records; implement provider refunds, retries, and reconciliation without double refunds.
- [x] Restrict refund issuance to super admins as described in the role requirements.
- [x] Add trip cancellation, affected-passenger notifications, and appropriate refund processing.
- [x] Add cancellation, trip cancellation, and refund emails in Arabic and English.
- [x] Add departure reminders for trips departing in 24 hours, without duplicate reminder records or normal concurrent sends.
- [x] Add scheduled cleanup of expired code secrets, expired account mail and old session/token families while preserving verification identity, resend throttles and replay detection.
- [ ] Use Redis/BullMQ for queued work as required; preserve the transactional email outbox.

Working result: a paid sandbox booking supports the full ticket, notification, cancellation, and refund lifecycle.

## Phase 10 — Backend completion gate

Complete this before creating apps/web or apps/admin:

- [ ] Verify every agreed backend feature has models/migrations, endpoints, validation, errors, authorization where relevant, tests, and API usage notes.
- [ ] Verify pricing, booking status transitions, ownership, session rotation, seat concurrency, and payment/refund idempotency.
- [ ] Verify fresh database setup, seeds, indexes, pagination, readiness, logs, and background workers.
- [ ] Confirm email/ticket/notification APIs and Arabic/English templates.
- [x] Expose defined administrator travel-day booking, upcoming/departed-trip and allocation-occupancy metrics.
- [x] Add read-only settlement counts and verified gross-capture amounts with a defined Cairo last-update date basis.
- [ ] Add refund, fee, payout and net-revenue reporting after their persisted data and policy are defined.
- [x] Add backend CI checks for formatting, lint, TypeScript and build without secrets/services.
- [x] Complete deployment/API configuration handoff for frontend work.
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
- [x] Add GitHub Actions for clean npm installation, formatting, lint, type checks and API build.
- [ ] Add automated test coverage to CI when the owner resumes testing; dependency auditing remains separate.
- [ ] Write environment setup, architecture, deployment, backup, restore, and troubleshooting instructions.

Working result: the critical user flows and failure cases pass repeatable checks in CI.

## Phase 14 — Production payments and deployment

Small steps:

- [ ] Verify current provider availability and merchant requirements; select an Egyptian payment provider.
- [ ] Implement the chosen provider through PaymentProvider and verify its supported methods, webhooks, and refunds.
- [ ] Keep PayPal sandbox as a development/test option where useful.
- [x] Add production multi-stage Docker builds, non-root containers, health checks, and `.dockerignore`.
- [x] Separate development and production Compose configuration; keep PostgreSQL private (Redis is not required).
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

Payment reference recovery is implemented in the existing opt-in worker: UNKNOWN/stale REQUESTING operations are queried by their exact operation UUID, validated against account/TEST/EGP/amount, and correlated without resending creation. Known orders without an original authorization receipt can use the same authenticated lookup. Its latest-transaction limitation does not permit guessing parent IDs or reconstructing lost checkout links. The migration only widens the reference-pair check to allow a recovered order ID without an intention ID; READY still requires a verified intention and encrypted checkout. Owned checkout/status endpoints and protected administrator payment lists/details are implemented; merchant verification and policy agreement remain required before activation.

Administrator payment reads are complete: list/detail of PaymentAttempt records includes safe customer/booking summaries, server-derived payment status, authorization/provider references and settlement/review information. Queries support exact relations/references, separate authorization and settlement statuses, a Cairo creation-day filter and bounded stable pagination. Read paths use the same status serializer as passengers and never decrypt checkout URLs, query Paymob or write financial state. A createdAt/id index supports the list; account verification, refunds and ticket/notification work remain separate.

Ticket issuance is atomic with verified full capture and booking confirmation. One persisted Ticket per booking doubles as its bounded email outbox; the existing email worker sends Arabic/English text with a PNG QR attachment and retry/backoff. Owner-only GET /bookings/:id/ticket rechecks confirmed/paid state and active seat allocations, including for historical journeys. QR contains only an opaque versioned ticket identifier; it is not a public lookup, payment proof or boarding/check-in authorization. No PDF or boarding scan workflow is included. Mail failure never reverses confirmation, and SMTP delivery remains at least once after a crash. Existing artificially confirmed rows without a ticket are not backfilled. Local payment gates remain disabled.

Departure reminders are complete in the existing email worker. Ticket stores separate reminder delivery state and retries, so confirmation delivery and reminders do not overwrite each other. The worker selects up to 20 due tickets for journeys at most 24 elapsed hours away, rechecks paid/confirmed/current seats/recipient eligibility under the ticket lock, and uses Arabic/English plain text with Cairo times. Tickets issued inside the final 24 hours skip a redundant reminder. Late worker catch-up stops at departure; retries are bounded to five and SMTP crash duplicates remain possible. No scheduler/Redis dependency, public resend endpoint or payment activation was introduced.

Authentication cleanup is complete: an hourly, bounded local worker clears expired verification/reset hashes and account-email ciphertext, and deletes account-email records and sessions only 24 hours after expiry. Session deletion cascades its refresh tokens; used or individually expired tokens are not independently removed while their session remains. Verification/reset rows retain their ids and throttle state, so resend and recovery still work after clearing a code. A nullable EmailVerification.codeHash and four expiry indexes support this; API/mail guards now reject a cleared hash. Cleanup has no public route and never touches booking, payment, ticket, audit or user history.

Administrator operational statistics are complete: protected GET /admin/statistics accepts a strict optional Cairo travelDate (defaults to today). One read-only parameterized PostgreSQL snapshot aggregates trip counts, effective booking states and actual seat allocations/capacity, with bounded request rate and no personal data. Expired pending holds do not inflate occupancy before worker cleanup; processing/confirmed allocations remain protected. Cancelled trips remain visible in trip/booking history but are excluded from seat capacity/occupancy. Capacity is summed per departure, independent of catalog activation; this is operational allocation occupancy, not a sales or verified revenue report. Tests cover empty days, 25-hour Cairo DST boundaries, inclusive/exclusive timestamps, releases, status buckets, current staff roles/session revocation and unchanged booking/seat data. Financial reporting, merchant verification and operator cancellation/refund decisions remain separate.

## Current learning workflow — 2026-10-18

The owner requested removal of all automated test files and commands and no new test code for subsequent features for now. This instruction overrides earlier test-suite requirements in the roadmap until the owner chooses to resume testing. Continue TypeScript, ESLint, formatting and build checks. Keep Route -> Controller -> Service separation, createApp service overrides and payment/mail interfaces so tests can be added later. The former suite is recoverable from Git commit 0099df6; do not rewrite Git history. Historical completed-test notes remain records of past validation, not available commands. Future testing/CI coverage tasks remain deferred.

Administrator payment statistics are complete: protected GET /admin/payments/statistics accepts a strict optional Cairo date and reports settlement outcomes by their current last-updated day. Confirmed captured sums require completed reconciliation, a confirmed booking and exact EGP/amount/expiry snapshots; voids and unresolved/review records do not add money. Aggregate amounts stay exact strings, and inconsistent records are flagged read-only. The report exposes its SETTLEMENT_LAST_UPDATED_AT date basis and does not claim a provider capture timestamp, historical ledger, refunds, fees, payouts or net revenue. No schema/dependency/payment-activation change or automated test code is introduced. Current checks use TypeScript, lint, formatting, build and a manual read-only report invocation; full behavioral test coverage remains deferred at the owner's request.

Backend CI is implemented in .github/workflows/ci.yml: push/pull_request/manual triggers, read-only repository permission, pinned checkout/setup-node release commits, Node 24.18.0 on Ubuntu 24.04, npm download caching, npm ci followed by format/lint/typecheck/build. The job has a 15-minute timeout and cancels superseded same-ref runs. No automated tests, database/migrations, secrets, workers, provider calls or deployment are added. Branch protection is not changed.

Request identifiers are implemented: server-generated UUIDs in X-Request-ID, installed before CORS and JSON parsing, available through response.locals.requestId and exposed to allowed browser origins. GitHub Actions billing troubleshooting is deferred at the owner's request; the workflow remains in place. No automated test files are added.

## Backend integration handoff — 2026-10-18

Completed: privacy-preserving correlated request/error logs; bounded PostgreSQL readiness and graceful HTTP/Prisma shutdown; super-admin future-trip cancellation with immutable history, serialized seat release, unpaid-hold expiry, durable full-refund entitlement and bilingual notices; super-admin refund list/detail/statistics/issue/inquiry APIs; an opt-in TEST inquiry worker; exact full-refund confirmation, send-once claims and uncertain/partial-outcome isolation; passenger/operator CANCELLED/REFUNDED read consistency; cancelled-booking statistics; root README frontend/session/payment contracts and run instructions. No new dependency, test file or LIVE operation was added. Refund retries mean inquiry retries, never automatic resending of an uncertain financial POST.

Verification: fresh isolated migration replay and demo seed; real local PostgreSQL service/HTTP checks with local fake provider transport; concurrent cancellation and single refund issuance; exact full success and notice delivery; timeout/no resend; partial-refund review; live super-admin revalidation; unresolved capture rejection; report consistency and persisted mail retry. The additive migration was applied to the development database without deleting existing data. PostgreSQL-backed outboxes remain sufficient; Redis/BullMQ is deferred until a real scaling need exists.

Backend code can support starting apps/web then apps/admin. Remaining external prerequisites are merchant-specific TEST OWNER_ID, Auth/Capture capability, HTTPS notification/return URLs and real sandbox payment/refund verification. Local credential format checks are not remote payment verification; activation flags remain unchanged/disabled. GitHub Actions billing and automated regression suites remain deferred by explicit instruction. Fees/payout/net-revenue reporting requires actual provider accounting data and remains later release work; the implemented refund report returns unknown accounting fields as null. Production deployment/real-money readiness is not claimed.

## Deployment/recovery preparation — 2026-10-18

Added multi-stage non-root API/migration Docker targets and an allowlisted build context; independent production Compose with private PostgreSQL, loopback API publishing, explicit migration service and separate worker/payment profiles; production startup checks for database/HTTPS origins/independent secrets/TLS SMTP; configurable bind host and narrowly configurable proxy hops; cancellable worker sleeps; safe host-side custom-format PostgreSQL backups and new-database-only restores; private aggregate operational checks; a super-admin fresh-evidence review path with actor audit and no money resend; beginner Paymob setup instructions and an unsent support-message template. No host/domain was provisioned or application published. No TEST or LIVE payment was initiated.

Verified backup/restore row-count equality across all 28 application/migration tables in a separate restored database. Verified production configuration rejection paths and preserved local defaults. Reviewed a partial-refund record with a fake transport: automatic inquiry kept REVIEW; a current super admin could confirm fresh exact full-refund evidence, audit the action and send no additional refund. Local operations snapshot reported no attention conditions.

Remaining external gates: account-specific Paymob TEST Auth/Capture/refund/owner confirmation; reachable HTTPS webhook and browser result page; real sandbox loop verification; selected host/domain/SMTP provider; off-host encrypted backup storage, alert delivery and production approval. These are not prerequisites for coding the local passenger site/dashboard and are not marked complete by preparing configuration files. Automated test code and GitHub Actions billing remain explicitly deferred.

Container smoke verification passed: non-root uid 1000 and native Argon2; runtime without .env/Prisma CLI; read-only API root filesystem; private PostgreSQL; all 27 migrations replayed with the non-root migration image; API ready and correlated HTTP headers; operational report ok; API and three default workers shut down with exit 0. Isolated resources were removed after verification. No public service or provider payment was created.

Owner steering: Paymob Auth/Capture capability is unknown, so defer provider activation and real sandbox financial verification. Keep all payment activation flags disabled and proceed to passenger website features; this external gate no longer delays local frontend development. Do not switch to direct-sale charging without a new agreed payment design.
