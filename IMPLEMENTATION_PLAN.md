# Bus Booking Platform — Implementation Roadmap

Status: local PostgreSQL 18 is running and verified healthy. SQL connectivity and persistence across container recreation pass; the owner reviewed and approved publishing this step. No Prisma models or application tables have been added. Logging remains deferred.

## How we will build

Build one small feature at a time, explain it, run it, verify it, and commit it before moving on. Each phase contains several small commits. A phase is complete only when its working result can be demonstrated.

This root roadmap is the project's planning document and defines the implementation order. Detailed code explanations are provided in the chat rather than a docs folder. Its initial assumptions are one bus operator, account-based booking, Arabic as the default language, English support, and a fixed numbered seat layout. These are proposed defaults, not settled business decisions.

### Milestones

- **Trip browsing demo — phase 3:** search and view seeded trips through a working website.
- **Learning MVP — phase 6:** register, verify email, sign in, search, select seats, and make a reservation with a booking reference. No money is collected. This is a local learning milestone, not a public commercial launch.
- **Complete booking flow — phase 9:** operators manage trips; passengers pay in a sandbox and receive tickets and notifications.
- **Production release — phase 12:** production payment provider, operational checks, and deployment are ready.

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
- [ ] Connect Prisma and learn the migration workflow; use migrations rather than `db push`.
- [ ] Add cities and stations, including Arabic and English names and multiple stations per city.
- [ ] Add a minimal bus, numbered bus seats, route, and trip model.
- [ ] Add bus types, layout metadata, and amenities when extending the basic fleet model.
- [ ] Add seed data for a small set of cities, stations, buses, routes, and trips.
- [ ] Add constraints for distinct route endpoints, valid trip times, and nonnegative prices.
- [ ] Store money as integer piastres and timestamps with time zones; define Cairo date-search boundaries explicitly.

Working result: a fresh database can be recreated using committed migrations and the seed command.

## Phase 3 — Trip browsing demo

Small steps:

- [ ] Add city and station listing endpoints.
- [ ] Add trip search by origin city/station, destination city/station, and travel date.
- [ ] Add trip details and basic seat information.
- [ ] Validate requests and add pagination and appropriate query indexes.
- [ ] Create `apps/web` with Next.js and a small API client.
- [ ] Add the search form, results, and trip details pages, with loading, empty, and error states.
- [ ] Introduce TanStack Query for server data and shared Zod schemas where both apps need them.
- [ ] Establish mobile layouts, Arabic default, English translation structure, and RTL logical spacing.

Working result: search seeded trips and open their details from a browser.

## Phase 4 — Accounts and email verification

Small steps:

- [ ] Add users and hashed, expiring, single-use verification codes.
- [ ] Add registration with name, email, phone, and an Argon2id password hash.
- [ ] Add Mailpit and SMTP delivery for local email testing.
- [ ] Add email verification using a six-digit code; unverified accounts cannot sign in.
- [ ] Add resend cooldowns, code attempt limits, and auth rate limits.
- [ ] Add an email outbox and a small retrying worker for reliable delivery.
- [ ] Add Arabic and English verification templates.
- [ ] Add registration, verification, and resend UI using react-hook-form and Zod.
- [ ] Use generic account responses where needed to avoid exposing registered emails.

Working result: register, receive a code in Mailpit, and activate the account.

## Phase 5 — Secure sign-in and account recovery

Small steps:

- [ ] Add login, a short-lived access token, and a rotating refresh token in an httpOnly cookie.
- [ ] Store refresh-token hashes; detect reuse and revoke the affected token family.
- [ ] Add current-user lookup, protected routes, current-device logout, and logout-all.
- [ ] Add failed-login lockout and complete auth rate limiting, using Redis when needed.
- [ ] Add forgot-password and reset-password codes; revoke all sessions after a reset.
- [ ] Add user, admin, and super-admin authorization and ownership checks.
- [ ] Add login, session restoration, account, and password recovery pages.
- [ ] Verify cookie, CORS, and CSRF behavior for the chosen web/API deployment arrangement.

Working result: complete account lifecycle with tested session rotation and access restrictions.

## Phase 6 — Reservation MVP

Small steps:

- [ ] Add bookings and booking seats with an explicit status transition model.
- [ ] Add an accessible seat picker showing current availability.
- [ ] Add passenger details and server-calculated totals.
- [ ] Create reservations transactionally and prevent duplicate active seat allocations using a database constraint.
- [ ] Test two concurrent requests for the same seat; only one succeeds.
- [ ] Return a booking reference and add a confirmation page.
- [ ] Add my bookings and booking details with ownership checks.
- [ ] Allow cancellation of a no-payment reservation and release its seats.
- [ ] Clearly label this local flow as a reservation without payment; do not imply a paid ticket.

Working result: verified users reserve available seats and view or cancel their own reservations.

**Learning MVP complete.** Review the entire flow and explain the data model before expanding it.

## Phase 7 — Operator dashboard and management

Small steps:

- [ ] Create `apps/admin`, with protected admin access and reusable shared schemas.
- [ ] Add city and station management.
- [ ] Add bus type, amenities, seat layout, bus, and plate-number management.
- [ ] Add route and single-trip management, including prices and times.
- [ ] Guard edits to buses, layouts, and trips that already have reservations.
- [ ] Add recurring/bulk trip creation with validation and a review of generated departures.
- [ ] Add filtered booking lists and booking details.
- [ ] Add user lists and suspend/activate controls; enforce suspension in the API/session flow.
- [ ] Add super-admin-only admin management.
- [ ] Record admin mutations in an audit log; add a super-admin audit viewer.

Working result: authorized operators manage the data previously supplied by seeds.

## Phase 8 — Seat holds and sandbox payments

Small steps:

- [ ] Agree on the exact hold duration, cancellation windows, and refund rules before implementing paid bookings.
- [ ] Replace immediate reservation confirmation with pending payment and a default ten-minute hold.
- [ ] Add hold countdown, expiry handling, and a worker that releases expired holds.
- [ ] Keep the active-seat database uniqueness constraint for held and confirmed seats.
- [ ] Define payment and booking transitions, including delayed payment completion after hold expiry.
- [ ] Add a PaymentProvider interface and PayPal sandbox implementation.
- [ ] Add create/capture endpoints with server-calculated amounts and idempotency keys.
- [ ] Persist payment transactions and webhook events.
- [ ] Verify webhook signatures and process duplicate or out-of-order events safely.
- [ ] Confirm bookings only after verified payment success; handle failure and cancellation.
- [ ] Add checkout and payment-result pages plus admin payment lists and provider references.
- [ ] Test hold expiry, concurrent booking, duplicate webhooks, and payment/expiry races.

Working result: complete a sandbox payment and obtain exactly one confirmed booking with correct seat allocation.

## Phase 9 — Tickets, notifications, cancellations, and refunds

Small steps:

- [ ] Add in-app and emailed tickets with booking references and QR codes.
- [ ] Add booking confirmation and payment receipt emails.
- [ ] Apply the agreed cancellation/refund policy to passenger and admin actions.
- [ ] Persist refund records; implement provider refunds, retries, and reconciliation without double refunds.
- [ ] Restrict refund issuance to super admins as described in the role requirements.
- [ ] Add trip cancellation, affected-passenger notifications, and appropriate refund processing.
- [ ] Add cancellation, trip cancellation, and refund emails in Arabic and English.
- [ ] Add departure reminders for trips departing in 24 hours, without duplicate reminders.
- [ ] Add scheduled cleanup of expired codes and old refresh tokens.
- [ ] Use Redis/BullMQ for queued work as required; preserve the transactional email outbox.

Working result: a paid sandbox booking supports the full ticket, notification, cancellation, and refund lifecycle.

## Phase 10 — Complete passenger and admin experience

Small steps:

- [ ] Complete Arabic and English UI and email coverage and check full RTL behavior.
- [ ] Add light/dark themes, design tokens, and consistent shadcn/ui components.
- [ ] Add persistent booking summaries and clear validation and recovery messages.
- [ ] Separate upcoming, past, and cancelled bookings.
- [ ] Add dashboard metrics: today's bookings, revenue, upcoming trips, and occupancy; define each metric precisely.
- [ ] Check mobile layouts, keyboard operation, focus, screen-reader labels, and color contrast.
- [ ] Use Zustand only for client state that needs it, such as a multi-step booking draft.

Working result: both applications are complete and usable across languages, themes, and supported screen sizes.

## Phase 11 — Release verification and reliability

Small steps:

- [ ] Complete service tests for pricing, code verification, session rotation, and booking transitions.
- [ ] Complete real-PostgreSQL integration tests for constraints, concurrency, and payment/refund idempotency.
- [ ] Add Playwright coverage for registration, verification, search, seats, payment, and tickets.
- [ ] Review authorization bypass, booking ownership, rate limits, and sensitive error/log output.
- [ ] Review indexes, pagination, retry behavior, health/readiness checks, and worker failures.
- [ ] Add CI for linting, type checks, relevant tests, and dependency auditing.
- [ ] Write environment setup, architecture, deployment, backup, restore, and troubleshooting instructions.

Working result: the critical user flows and failure cases pass repeatable checks in CI.

## Phase 12 — Production payments and deployment

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
| Hold duration              | Ten minutes                                                | Phase 8                    |
| Cancellation/refund policy | No assumed percentages                                     | Phase 8                    |
| Production provider        | Evaluate actual merchant eligibility and supported methods | Phase 12                   |

## Learning and Git workflow for every small step

1. Explain the feature, its purpose, and the files that will change.
2. Implement one coherent change; avoid generating future modules or unused abstractions.
3. Run it and demonstrate its behavior. Add meaningful tests for business rules and risky behavior.
4. Explain the request/data flow, important code, and relevant trade-offs.
5. Review the diff, exclude secrets/generated clutter, and create a focused Conventional Commit when Git commits are authorized.
6. Update the roadmap and run instructions, then proceed at the user's learning pace.

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

The roadmap is being implemented one learning step at a time. Error handling and the TypeScript configuration fix are approved for publication. Request IDs and logging are deferred. CORS is approved for publication; local PostgreSQL is approved for publication; the next small step is Prisma connection.
