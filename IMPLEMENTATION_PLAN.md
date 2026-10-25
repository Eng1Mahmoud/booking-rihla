# Bus Booking Platform — Implementation Roadmap

Status: Backend implementation is ready for local passenger-site/dashboard integration. Operator cancellation/full-refund policy is approved and implemented with durable notices, guarded TEST refund issuance/inquiry, request logs, PostgreSQL readiness and graceful shutdown. Actual Paymob TEST direct card payment, HMAC/inquiry confirmation, ticket and full refund were verified; LIVE deployment remains separate. Automated tests and GitHub Actions billing troubleshooting are deferred by the owner.

## How we will build

Build in focused feature batches. Combine related models, migrations, endpoints, validation, appropriate checks, and usage notes in one commit. Explain the outcome after the batch and go deeper on requested code. Do not pause after every small subtask; keep moving toward the MVP. Use a simple Route -> Controller -> Service -> Prisma structure with consistent naming; avoid a separate repository layer for now. Create cohesive local feature commits after checks; pushing requires the owner’s explicit approval. Production publication and real-money operations still need explicit approval. A phase is complete only when its working result can be demonstrated.

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

Confirmed direction: Paymob TEST direct card payments in EGP; Auth/Capture removed by the owner. PaymentSession replaces PaymentAuthorization. Successful standalone payment confirms one booking/ticket through authenticated inquiry. An expired/unavailable paid booking creates a full refund obligation without reclaiming another passenger's seat. Passenger cancellation remains forbidden; only a super admin issues refunds.

- [x] Ten-minute holds, expiry worker/history and unique active-seat allocation.
- [x] Server-priced idempotent attempts and durable send-once payment sessions.
- [x] TEST Intention/Unified Checkout capped to remaining hold time, without capture/void requests.
- [x] HMAC receipt/deduplication, authenticated inquiry and missing-callback reference recovery.
- [x] Atomic successful SALE/booking/ticket or exceptional full-refund debt for an unfulfillable payment.
- [x] Owner checkout/status, operator reads/reports, backend browser-return page and refund notices.
- [x] Local API-key authentication and account user OWNER_ID from authenticated response.
- [x] Manual isolated local checks for concurrency, timeout/no resend, expiry/reallocation, wrong scope and refunds; no test files in Git.
- [x] Temporary restricted HTTPS tunnel approved and used for actual callbacks/return.
- [x] Actual merchant TEST card success, HMAC notification, authenticated inquiry, single ticket, full refund and provider checkout expiry.
- [ ] Optional provider-specific declined-card / OTP challenge simulation when a documented simulator is available; backend negative paths passed locally, and actual inquiry reported 3-D Secure=true.

Working result: exactly one confirmed paid booking or an explicit refund obligation when fulfillment becomes impossible. Direct charging cannot guarantee zero refunds across network/expiry races.

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
- [x] Add read-only settlement counts and verified gross-payment amounts with a defined Cairo last-update date basis.
- [ ] Add refund, fee, payout and net-revenue reporting after their persisted data and policy are defined.
- [x] Add backend CI checks for formatting, lint, TypeScript and build without secrets/services.
- [x] Complete deployment/API configuration handoff for frontend work.
- [ ] Resolve outstanding backend defects and push the completed feature commits.

Working result: the agreed backend scope works through HTTP and repeatable tests, ready for frontend integration. Production provider onboarding remains part of release preparation.

## Phase 11 — Passenger website: proposed implementation plan

Planning update — 2026-10-19. The owner requested discussion of tooling, feature-based structure, reusable components, visual direction and pages before implementation. This proposal is pending that discussion; it does not authorize treating the visual design as approved. Build apps/web first and apps/admin afterward. Do not scaffold applications or install dependencies as part of this planning update.

### Proposed tools

| Tool                                                            | Responsibility                                                                                      | Adoption                      |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------- |
| Next.js App Router + React + TypeScript                         | Routing, layouts, public-page server rendering and interactive client components                    | Foundation                    |
| Tailwind CSS                                                    | Responsive styling, logical RTL spacing and design tokens                                           | Foundation                    |
| shadcn/ui                                                       | Editable UI primitives such as buttons, fields, dialogs and sheets, styled with our identity        | Add components when needed    |
| next-intl                                                       | Arabic/English messages, locale routes and direction                                                | Foundation                    |
| TanStack Query                                                  | Interactive server state: seat availability, owned bookings, payment polling and cache invalidation | First interactive API feature |
| React Hook Form + Zod                                           | Form state and browser validation, with server validation remaining authoritative                   | First account forms           |
| Native fetch                                                    | Small typed API transport with normalized errors, cancellation and explicit retry rules             | Foundation                    |
| Lucide React                                                    | Consistent icons; preserve physical seat orientation in RTL                                         | As needed                     |
| Intl                                                            | Cairo date/time, durations and EGP display                                                          | Foundation                    |
| Existing npm workspaces, ESLint, Prettier and TypeScript checks | Repository workflow and verification                                                                | Extend existing configuration |

Install current compatible stable versions at implementation time and preserve exact resolved versions in package-lock.json. Continue npm rather than adding another package manager. Owner decision (2026-10-21): no Zustand or additional global client store. TanStack Query owns fetched server data, including the current user under authKeys.me; React Hook Form owns form state; useState/useReducer own local UI state and the selected-seat draft. A selected seat is never a reservation: backend availability and ownership remain authoritative. Keep shareable search/filter/page state in the URL. Do not persist access/refresh tokens, passwords, verification codes, passenger/contact information or checkout URLs in browser storage. SSR QueryClient instances are request-scoped; only the safe user view is hydrated, never credentials.

Public search/details use Server Components where useful. TanStack Query owns live interactive reads; do not create two independent caches for the same data. Query strings hold search/date/page state so reload/back/share work. Seat/payment reads must remain fresh rather than being statically cached. Browser access tokens stay in memory; refresh tokens remain in the backend HttpOnly cookie. The API client coordinates refresh and does not blindly repeat booking/checkout/refund writes after an uncertain response. Coordinate refresh across tabs before declaring session integration complete. Keep database and Paymob secrets exclusively in the backend.

### Feature-based source structure

```text
apps/
  api/                              # Existing backend
  web/
    public/
    src/
      app/
        [locale]/
          layout.tsx
          (public)/
            page.tsx
            trips/page.tsx
            trips/[tripId]/page.tsx
          (auth)/
            login/page.tsx
            register/page.tsx
            verify-email/page.tsx
            forgot-password/page.tsx
            reset-password/page.tsx
          (account)/
            account/page.tsx
            account/payments/page.tsx
            bookings/page.tsx
            bookings/[bookingId]/page.tsx
            bookings/[bookingId]/ticket/page.tsx
          checkout/[bookingId]/page.tsx
          checkout/result/page.tsx
      features/
        auth/
          api.ts
          schemas.ts
          types.ts
          components/
          hooks/
        trips/
        seats/
        checkout/
        bookings/
        tickets/
        account/
      components/
        ui/                         # shadcn primitives
        layout/                     # Header, footer, navigation
        shared/                     # Cross-feature states and small widgets
      lib/
        api-client.ts
        api-error.ts
        formatters.ts
        env.ts
      i18n/
      messages/
        ar.json
        en.json
      stores/
        auth-store.ts               # In-memory session state
        booking-store.ts            # Draft trip/seat selection; no server-data cache
      providers/
        app-providers.tsx
```

Create files/directories only when the feature uses them. page.tsx composes a feature screen; business UI, data access, hooks and validation stay in that feature. Example: TripCard belongs to features/trips/components; Button belongs to components/ui; formatMoney belongs to lib. Features depend on shared primitives/utilities, which do not import features. Keep cross-feature imports small and explicit. Route groups organize layouts and do not appear in URLs. Actual links have /ar or /en locale prefixes.

### Reuse rules

- One field primitive and validation-message style for forms; domain-specific forms stay with their feature.
- Reuse CitySelect, TripSearchForm, TripCard, JourneySummary, SeatMap, SeatLegend, HoldCountdown, BookingStatusBadge and MoneyDisplay where their semantics match.
- Shared loading, empty, error, retry and pagination patterns; accessible focus and feedback as part of every feature.
- Prefer composition and clear props; avoid a single configurable component for unrelated page types or a hook for every function.
- Reuse contracts and pure functions, not backend ORM objects or server-only modules in the browser.
- Start shared code inside apps/web. When apps/admin becomes the second actual consumer, extract proven primitives/tokens to packages/ui and browser-safe contracts/formatters to a small package if warranted. At that point extend workspaces to packages/*. Neither app imports another app's source.

### Passenger pages and scope

All paths below are relative to /ar or /en.

| Page               | Route                                 | Required behavior                                                                                                                  |
| ------------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Home               | /                                     | City/date search, clear booking entry, actual data and a compact explanation of the booking steps                                  |
| Search results     | /trips                                | Origin, destination, date, server-supported pagination, departure/arrival, price, type/amenities and actionable empty/error states |
| Trip and seats     | /trips/[tripId]                       | Stations/times, numbered physical seat layout, available/unavailable/selected states, selected-seat summary                        |
| Registration       | /register                             | Name/email/phone/password and inline validation                                                                                    |
| Email verification | /verify-email                         | Six-digit code, resend cooldown and retained verificationId                                                                        |
| Login              | /login                                | Session creation and safe return to the intended booking flow                                                                      |
| Password recovery  | /forgot-password, /reset-password     | Existing code-based backend recovery flow, expiry and resend/error handling                                                        |
| Account            | /account                              | Current account information and session actions already supported by the API                                                       |
| Checkout           | /checkout/[bookingId]                 | Passenger/contact details, server price, remaining hold and explicit Paymob handoff                                                |
| Payment result     | /checkout/result                      | Fetch authoritative owned payment status; waiting/success/expiry/failure/refund/review, never trust provider redirect query values |
| My bookings        | /bookings                             | Upcoming, past, expired and operator-cancelled bookings with bounded pagination                                                    |
| Booking details    | /bookings/[bookingId]                 | Passengers, route, state, paid amount, refund information and ticket link; no passenger cancellation                               |
| Ticket             | /bookings/[bookingId]/ticket          | Existing backend ticket/QR, status and accessible presentation                                                                     |
| Help and policies  | /help, /terms, /privacy               | Publish when owner-approved content exists; explain no passenger cancellation and full refund if operator cancels                  |
| System states      | not-found.tsx, error.tsx, loading.tsx | Safe recovery actions, pending UI and correct missing-resource behavior                                                            |

Do not expose profile editing, password-changing while logged in, downloads, advanced filters or totals that the existing API does not provide. Confirm any new API requirement before adding its UI. Search currently exposes bus capacity, not live available-seat totals for every result card; show live availability on trip details without introducing a request per result card. MVP is one-way, account-required booking; round trips, guest checkout, coupons and loyalty remain later work.

The fixed STANDARD_2_2 template determines physical positioning from numbers. Keep the seat map LTR in both languages so aisle/window/driver positions never flip. Submit seatId, not the display number. Refresh availability before creating the hold; only a successful backend booking response reserves seats. After login, revalidate a prior selection because another passenger may have booked it. The backend price and expiresAt/serverTime govern totals and countdown; never persist a checkout URL or treat a client countdown as authority.

### Passenger account area and activity history

Owner addition — 2026-10-19: provide a clear passenger account interface for booking history and payment/refund activity. Use shared account navigation: account details, my bookings, payments/refunds and logout. On desktop use a compact account navigation beside the content; on mobile use an accessible compact menu/tabs and readable activity cards. Share statuses, money/date formatting, pagination and loading/empty/error UI with the rest of the passenger site.

- /bookings: existing owned booking-history page with booking reference, journey, Cairo departure date/time, total and current booking state. Provide upcoming/past/expired/operator-cancelled views using accurate API-supported filtering; add backend filters if necessary rather than filtering one fetched page and presenting it as the complete history. Each entry links to booking details and an issued valid ticket.
- /account/payments: protected payment/refund history showing reference, booking link, recorded date/time, server amount in EGP, payment state and refund state/amount where present. Clearly distinguish pending/failed/expired attempts from paid transactions and owed refunds from completed refunds. Users cannot cancel bookings or initiate their own refunds here.
- Current backend supports owned bookings and per-booking payment-status reads, but has no complete passenger-wide payment-history endpoint. Add a dedicated authenticated, paginated own-payment activity endpoint before connecting this page; proposed GET /api/v1/account/payments. Scope exclusively from the authenticated user, never a client-selected userId. Return explicit safe customer-facing fields and stable pagination; no checkout links, raw webhook payloads, account/integration identifiers, credentials or other passengers' data.
- Payment history is customer-facing business activity: one record per payment attempt, with linked refund state, not a raw list of duplicate provider callbacks. Display refund details explicitly, and do not invent fees, bank payout timestamps or unsupported accounting totals. If a combined payment/refund timeline is desired, define its record types and pagination in the API contract before implementation.
- Deliver the account shell and booking history in the account/booking batches, then complete real payment/refund history in W5. This customer account area is part of apps/web; the staff dashboard remains the following phase.

### Visual direction — BlueBus reference, simplified premium execution

Owner choice — 2026-10-19: use https://bluebus.com.eg/ as the reference, with a simpler premium design and a deliberate visual identity. This replaces the earlier navy/teal/sand proposal. Tooling and feature-based structure remain proposals under discussion.

Observed reference: navy navigation, travel photography, a prominent white origin/destination/date search panel, trip browsing and numbered physical seat selection. The live homepage also includes a carousel, long marketing sections, route directories, app promotion and a notification request. Use the booking clarity and blue/white travel language as inspiration. Our page map follows our supported backend: one-way account-based booking, direct TEST card payments and no passenger cancellation. Reference UI is not evidence that our backend supports its extra features.

Public browser walkthrough on 2026-10-19: a homepage Cairo-to-Alexandria route link opened /ticketing with changeable origin, destination and date, nearby-day controls, trip results and a "My Trips" summary. A result exposed departure, stations, bus class, price and an available-seat count. "Choose a Seat" opened a modal with an availability legend, numbered 2+2 physical seating separated by an aisle, front-of-bus orientation, a selected-seat summary and total price. Clicking an available seat while signed out opened a registration/login/guest dialog; no account, checkout or payment was completed. These are observed public UI behaviors, not evidence of BlueBus internals or of later checkout behavior.

Our implementation will show the trip context beside the seat map, keep a clear seat legend and a server-priced selection summary, and return a signed-out passenger to the same trip after login. We will require an account because our API does not support guest checkout. The search and results should be simpler than the reference, with no unsupported round-trip switch or unverified available-seat totals on every result. The passenger account area will provide our own booking and payment history; BlueBus's private history was not inspected.

| Token      | Proposed value | Role                                                     |
| ---------- | -------------- | -------------------------------------------------------- |
| Navy       | #082D4F        | Header, headings and strong text                         |
| Ocean blue | #087FAE        | Primary actions and selected seats; verify text contrast |
| Mist       | #F6F8FB        | Page canvas                                              |
| White      | #FFFFFF        | Main surfaces and search panel                           |
| Slate      | #546578        | Secondary text                                           |
| Border     | #DCE4EC        | Restrained separators and field boundaries               |

Add semantic error/success/waiting colors only where their meaning is needed, with text/icons and checked contrast. Use blue consistently for an actionable selection; an unavailable seat should be quiet and clearly disabled rather than making most of the bus visually alarming. Preserve the physical LTR seat map in Arabic. IBM Plex Sans Arabic with matching Latin text remains the initial type proposal; compare actual Arabic numerals, dates, prices and form labels before confirming it. Prefer readable 16px body text, an 8px-based spacing scale, moderate corners and restrained shadows.

Premium is expressed through typography, alignment, image quality, generous useful spacing and predictable interactions. It is not a collection of decorations. Use one properly licensed travel/bus photograph if a suitable asset exists; do not reuse BlueBus assets, logo or copy. Keep the initial name/logo neutral until the owner provides the brand. Use a static hero, concise booking-focused copy and an obvious search panel above the fold. Home needs only the booking entry, a compact explanation of the supported booking steps and a useful footer initially. Add destination content only when it can be supported with actual project data.

Desktop homepage wireframe, mirrored for Arabic reading order:

```text
[Brand]                    [My bookings] [Language] [Account]
[One travel photograph + short booking headline]
[Origin] [Destination] [Travel date]                  [Search]
[Choose trip] -> [Choose seat] -> [Complete payment]
[Help] [Policies] [Footer]
```

Desktop results wireframe:

```text
[Brand]                    [My bookings] [Language] [Account]
[Origin] [Destination] [Date]                         [Search]
[Route and selected date]
[Departure -- duration -- Arrival / stations] [Price]
[Bus class and actual amenities]              [View seats]
[Next trip row]
[Pagination]
```

Trip/seat selection wireframe:

```text
[Route, stations, departure and arrival]
[Front / driver]
[1][2]  aisle  [3][4]           [Journey summary]
[5][6]  aisle  [7][8]           [Selected seats / total]
[Clear seat-state legend]       [Continue]
```

On mobile, stack fields and trip information, keep the seat map usable at normal zoom and show a sticky total/action without hiding content. Use a full page or accessible sheet for seats according to viewport. Account and payment screens use the same calm visual language. The dashboard later shares typography, tokens and primitives but gets an operational table/form layout rather than the passenger hero.

Before implementation, review three representative views together: home/search, results and physical seat selection. Check actual Arabic/English content at desktop/mobile sizes, hierarchy, contrast, focus, form errors and selected/unavailable seat states. Revise the shared tokens/components before building all pages. Establish semantic light/dark tokens in the foundation, with the default light appearance following the reference and equivalent contrast checks for dark mode.

Design exclusions for the initial passenger site: notification permission prompts on entry, automatic carousels, invented counters/reviews/trust badges, repeated decorative cards, large gradients/glass effects, unnecessary motion, unsupported round-trip controls and oversized marketing copy. Every visible action must lead to a working supported flow. shadcn supplies editable primitives, not the final site layout or an unchanged dashboard template.

### Delivery batches

| Batch                     | Deliverable                                                                                              | Completion check                                                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| W0 — Direction            | Discuss tools, design, page map, structure and API limitations                                           | Owner feedback incorporated; this document remains the single root plan                                                                |
| W1 — Foundation           | apps/web, feature boundaries, Arabic/English, design tokens/themes, application layout and API transport | Responsive shell, functional locale/theme switch, clear unavailable-API state; no dummy actions                                        |
| W2 — Trip discovery       | Home search, real results, details and read-only physical seat map                                       | Correct Cairo date, working URL filters/pagination, loading/empty/error states and mobile layout                                       |
| W3 — Accounts             | Registration, verify/resend, login, recovery, session restoration and account reads                      | Real local API/Mailpit flow; ownership errors, expiry, refresh/logout and return-to-trip behavior                                      |
| W4 — Booking              | Interactive seat selection, passenger/contact input, hold creation and server-priced summary             | Concurrent seat conflict handled, selection revalidated after login, countdown matches server and expiry recovery works                |
| W5 — Payment and tickets  | TEST Paymob handoff/result, booking list/details, own payment/refund history and ticket/QR               | Reload/return/unknown/expiry/refund states reflect backend; repeat clicks never duplicate money operations                             |
| W6 — Passenger completion | Complete Arabic/English, mobile/desktop, accessibility, polish and API integration gaps                  | Full search -> seats -> login -> hold -> TEST payment -> ticket journey; operator cancellation/refund visible without passenger cancel |
| D1 onward — Dashboard     | apps/admin, shared-code extraction and role-aware management features                                    | Start only after passenger integration is complete                                                                                     |

Each batch is a coherent reviewable commit: explain its files and flow in Arabic, then follow the owner's current Git instructions. Run TypeScript, ESLint, formatting, production build and manual browser verification for the touched feature. Add no automated test files under the current owner instruction; preserve pure functions, API boundaries and injectable dependencies so tests can be added later. Keep .env, .next, dist and local artifacts ignored. Frontend implementation began on 2026-10-19 in apps/web: localized foundation, public city search, live trip results and read-only seat details. Account, booking and payment UI remain subsequent batches.

### REA role

The owner ran REA setup for Codex and restarted it on 2026-10-19. REA 6.7.0 is now connected in Codex: its 207 tools are listed and binary_session responds with the live server identity. The public BlueBus walkthrough above was completed through the browser UI; any future REA browser investigation needs an available loopback Chrome DevTools endpoint. Native decompilation engines are not required for this website reference. REA is suitable for a specifically chosen reference application's observable behavior or shipped artifacts, not ordinary source-project architecture. For a selected reference we may inspect public search/seat UX, document observations, then implement our own design against our own API. Registration changes or analysis of unrelated applications are outside this planning step. Do not run diagnostics/setup merely to design the folder structure. Reference analysis can also use the existing browser tools if REA is not connected. Never import another site's assets, hidden APIs or source as a dependency of this application.

Reference docs: [Next.js server/client components](https://nextjs.org/docs/app/getting-started/server-and-client-components), [shadcn RTL](https://ui.shadcn.com/docs/rtl), [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview), [next-intl routing](https://next-intl.dev/docs/routing/setup).

## Phase 12 — Administration dashboard

Feature batches:

- [ ] D1: Build a separate dashboard application in apps/dashboard, mirroring the feature-based organization of apps/web and its Rihla identity. Give it its own development command, sign-in and independently named session cookies. Keep the passenger application unchanged.
- [ ] D1: Add a read-only date-filtered overview from /admin/statistics and /admin/payments/statistics. Preserve travel-day versus settlement-last-update semantics; do not label gross paid as net revenue. Deliver catalog/management modules in subsequent batches.
- [x] Add complete city/station management screens.
- [ ] Add bus types, amenities, fixed template selection, buses, plates, routes, and trip management screens.
- [ ] Add recurring/bulk trip creation with a review of generated departures and backend reservation safeguards.
- [ ] Add filtered bookings, details, payments, provider references, permitted refunds, and trip cancellation controls.
- [ ] Add user lists, suspension/activation, super-admin-only administrator management, and audit viewing.
- [ ] Add precisely defined booking/revenue/upcoming-trip/occupancy metrics.
- [ ] Complete Arabic/English, RTL, themes, accessibility, responsive behavior, and role-specific failure states.

City/station management batch completed locally on 2026-10-25: protected city/station lists, bilingual search, city filtering, 20-row pagination, RHF/Zod forms and confirmed deletes through the existing APIs. Linked-data failures are translated; every Action checks current staff access. Isolated production build, TypeScript, lint/format and synthetic CRUD, permission, failure, responsive and keyboard checks passed. Independent review returned ship for this ordinary extension, and the documentation comparison preserved the existing design system. No real catalog records were changed during verification. The earlier overview native workflow ledger remains open and is not closed by this batch.

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

The roadmap follows complete feature batches: finish, verify, explain, commit, and push before moving on. Backend first, then passenger website, then dashboard. City, Station, basic Bus/seat management, Route management, and Trip management are complete; repeatable seed data and passenger trip search are complete; passenger trip details and departure seat listing are complete; registration and email verification are complete; secure sign-in, rotating sessions and password recovery are complete; administrator roles and management API protection are complete; the reservation MVP without payment or passenger cancellation is complete; bus types and amenities are complete; simple fixed seat templates and trip guards are complete; finite batch trip preview and atomic creation are complete; administrator booking lists/details are complete; passenger account management with session revocation is complete; super-admin administrator management is complete; audit logging, expiring seat holds, the Paymob TEST adapter and durable signed webhook receipt are complete; owned payment-attempt preparation is complete; durable direct-payment session creation and authenticated SALE reconciliation are complete; authenticated reference recovery and missing-callback fallback are complete; owned checkout/status endpoints are complete behind a disabled-by-default TEST gate; actual merchant TEST payment/refund verification remains before frontend handoff.

Payment reference recovery is implemented in the existing opt-in worker: UNKNOWN/stale REQUESTING operations are queried by their exact operation UUID, validated against account/TEST/EGP/amount, and correlated without resending creation. Known orders without a signed payment receipt can use the same authenticated lookup. Its latest-transaction limitation does not permit guessing parent IDs or reconstructing lost checkout links. The migration only widens the reference-pair check to allow a recovered order ID without an intention ID; READY still requires a verified intention and encrypted checkout. Owned checkout/status endpoints and protected administrator payment lists/details are implemented; merchant TEST verification remains required before declaring payments complete.

Administrator payment reads are complete: list/detail of PaymentAttempt records includes safe customer/booking summaries, server-derived payment status, payment-session/provider references and settlement/review information. Queries support exact relations/references, separate payment-session and settlement statuses, a Cairo creation-day filter and bounded stable pagination. Read paths use the same status serializer as passengers and never decrypt checkout URLs, query Paymob or write financial state. A createdAt/id index supports the list; direct payments, refunds and ticket/notification work are now complete for the verified TEST flow.

Ticket issuance is atomic with verified full payment and booking confirmation. One persisted Ticket per booking doubles as its bounded email outbox; the existing email worker sends Arabic/English text with a PNG QR attachment and retry/backoff. Owner-only GET /bookings/:id/ticket rechecks confirmed/paid state and active seat allocations, including for historical journeys. QR contains only an opaque versioned ticket identifier; it is not a public lookup, payment proof or boarding/check-in authorization. No PDF or boarding scan workflow is included. Mail failure never reverses confirmation, and SMTP delivery remains at least once after a crash. Existing artificially confirmed rows without a ticket are not backfilled. Local payment gates remain disabled.

Departure reminders are complete in the existing email worker. Ticket stores separate reminder delivery state and retries, so confirmation delivery and reminders do not overwrite each other. The worker selects up to 20 due tickets for journeys at most 24 elapsed hours away, rechecks paid/confirmed/current seats/recipient eligibility under the ticket lock, and uses Arabic/English plain text with Cairo times. Tickets issued inside the final 24 hours skip a redundant reminder. Late worker catch-up stops at departure; retries are bounded to five and SMTP crash duplicates remain possible. No scheduler/Redis dependency, public resend endpoint or payment activation was introduced.

Authentication cleanup is complete: an hourly, bounded local worker clears expired verification/reset hashes and account-email ciphertext, and deletes account-email records and sessions only 24 hours after expiry. Session deletion cascades its refresh tokens; used or individually expired tokens are not independently removed while their session remains. Verification/reset rows retain their ids and throttle state, so resend and recovery still work after clearing a code. A nullable EmailVerification.codeHash and four expiry indexes support this; API/mail guards now reject a cleared hash. Cleanup has no public route and never touches booking, payment, ticket, audit or user history.

Administrator operational statistics are complete: protected GET /admin/statistics accepts a strict optional Cairo travelDate (defaults to today). One read-only parameterized PostgreSQL snapshot aggregates trip counts, effective booking states and actual seat allocations/capacity, with bounded request rate and no personal data. Expired pending holds do not inflate occupancy before worker cleanup; processing/confirmed allocations remain protected. Cancelled trips remain visible in trip/booking history but are excluded from seat capacity/occupancy. Capacity is summed per departure, independent of catalog activation; this is operational allocation occupancy, not a sales or verified revenue report. Tests cover empty days, 25-hour Cairo DST boundaries, inclusive/exclusive timestamps, releases, status buckets, current staff roles/session revocation and unchanged booking/seat data. Financial reporting, merchant verification and operator cancellation/refund decisions remain separate.

## Current learning workflow — 2026-10-18

The owner requested removal of all automated test files and commands and no new test code for subsequent features for now. This instruction overrides earlier test-suite requirements in the roadmap until the owner chooses to resume testing. Continue TypeScript, ESLint, formatting and build checks. Keep Route -> Controller -> Service separation, createApp service overrides and payment/mail interfaces so tests can be added later. The former suite is recoverable from Git commit 0099df6; do not rewrite Git history. Historical completed-test notes remain records of past validation, not available commands. Future testing/CI coverage tasks remain deferred.

Administrator payment statistics are complete: protected GET /admin/payments/statistics accepts a strict optional Cairo date and reports settlement outcomes by their current last-updated day. Confirmed paid sums require completed reconciliation, a confirmed booking and exact EGP/amount/expiry snapshots; unfulfilled and unresolved/review records do not add money. Aggregate amounts stay exact strings, and inconsistent records are flagged read-only. The report exposes its SETTLEMENT_LAST_UPDATED_AT date basis and does not claim a provider payment timestamp, historical ledger, refunds, fees, payouts or net revenue. No schema/dependency/payment-activation change or automated test code is introduced. Current checks use TypeScript, lint, formatting, build and a manual read-only report invocation; full behavioral test coverage remains deferred at the owner's request.

Backend CI is implemented in .github/workflows/ci.yml: push/pull_request/manual triggers, read-only repository permission, pinned checkout/setup-node release commits, Node 24.18.0 on Ubuntu 24.04, npm download caching, npm ci followed by format/lint/typecheck/build. The job has a 15-minute timeout and cancels superseded same-ref runs. No automated tests, database/migrations, secrets, workers, provider calls or deployment are added. Branch protection is not changed.

Request identifiers are implemented: server-generated UUIDs in X-Request-ID, installed before CORS and JSON parsing, available through response.locals.requestId and exposed to allowed browser origins. GitHub Actions billing troubleshooting is deferred at the owner's request; the workflow remains in place. No automated test files are added.

## Backend integration handoff — 2026-10-18

Completed: privacy-preserving correlated request/error logs; bounded PostgreSQL readiness and graceful HTTP/Prisma shutdown; super-admin future-trip cancellation with immutable history, serialized seat release, unpaid-hold expiry, durable full-refund entitlement and bilingual notices; super-admin refund list/detail/statistics/issue/inquiry APIs; an opt-in TEST inquiry worker; exact full-refund confirmation, send-once claims and uncertain/partial-outcome isolation; passenger/operator CANCELLED/REFUNDED read consistency; cancelled-booking statistics; root README frontend/session/payment contracts and run instructions. No new dependency, test file or LIVE operation was added. Refund retries mean inquiry retries, never automatic resending of an uncertain financial POST.

Verification: fresh isolated migration replay and demo seed; real local PostgreSQL service/HTTP checks with local fake provider transport; concurrent cancellation and single refund issuance; exact full success and notice delivery; timeout/no resend; partial-refund review; live super-admin revalidation; unresolved payment rejection; report consistency and persisted mail retry. The additive migration was applied to the development database without deleting existing data. PostgreSQL-backed outboxes remain sufficient; Redis/BullMQ is deferred until a real scaling need exists.

Backend code can support starting apps/web then apps/admin. Merchant TEST account authentication, owner scope, temporary HTTPS callback/return, direct card payment, verified HMAC/inquiry, ticket and full refund have passed. Future test sessions require another reachable HTTPS URL. Production/LIVE onboarding, provider-specific declined-card/OTP simulator coverage and GitHub Actions billing are separate follow-up work. Provider fees/payout data remains unavailable; accounting fields are null rather than guessed.

## Deployment/recovery preparation — 2026-10-18

Added multi-stage non-root API/migration Docker targets and an allowlisted build context; independent production Compose with private PostgreSQL, loopback API publishing, explicit migration service and separate worker/payment profiles; production startup checks for database/HTTPS origins/independent secrets/TLS SMTP; configurable bind host and narrowly configurable proxy hops; cancellable worker sleeps; safe host-side custom-format PostgreSQL backups and new-database-only restores; private aggregate operational checks; a super-admin fresh-evidence review path with actor audit and no money resend; beginner Paymob setup instructions and an unsent support-message template. No host/domain was provisioned or application published. No TEST or LIVE payment was initiated.

Verified backup/restore row-count equality across all 28 application/migration tables in a separate restored database. Verified production configuration rejection paths and preserved local defaults. Reviewed a partial-refund record with a fake transport: automatic inquiry kept REVIEW; a current super admin could confirm fresh exact full-refund evidence, audit the action and send no additional refund. Local operations snapshot reported no attention conditions.

Remaining release gates: a selected deployment host and stable HTTPS address, production SMTP, off-host encrypted backup storage, alert delivery and production approval. The core Paymob TEST direct-payment/refund flow has passed and does not block local frontend implementation. Automated test code and GitHub Actions billing remain explicitly deferred.

Container smoke verification passed: non-root uid 1000 and native Argon2; runtime without .env/Prisma CLI; read-only API root filesystem; private PostgreSQL; all 27 migrations replayed with the non-root migration image; API ready and correlated HTTP headers; operational report ok; API and three default workers shut down with exit 0. Isolated resources were removed after verification. No public service or provider payment was created.

Owner steering — 2026-10-19: finish Paymob before frontend; remove Auth/Capture and use TEST direct card payments. Complete real-provider verification before starting apps/web. A temporary restricted HTTPS tunnel was approved. Actual TEST card success, callback/inquiry confirmation, ticket issuance and full refund passed. A stable HTTPS URL is still required for future sessions/deployment; sandbox decline/OTP scenarios need provider simulation support.

Payment handoff: the core TEST card/payment/refund path is verified and has no remaining Auth/Capture dependency. Provider-specific decline/OTP simulations are additional coverage, not a prerequisite to build the frontend. Stable HTTPS, production onboarding/LIVE support and operational deployment remain release work. Temporary payment flags and tunnel were disabled after verification.

Frontend state decision — 2026-10-19: Zustand is explicitly selected by the owner for global client state, replacing the earlier proposal to defer a state library. Preserve the separation between Zustand client state, TanStack Query server state and React Hook Form form state. Zustand does not authorize or reserve a seat; backend ownership, price, hold and payment status remain authoritative. See [Zustand Next.js guidance](https://zustand.docs.pmnd.rs/learn/guides/nextjs).

Frontend delivery — 2026-10-19: replaced the initial visual draft with a photographic Egyptian travel layout, local IBM Plex Sans Arabic, station-aware search, date navigation, reusable trip cards and a physical LTR seat map with actual chair icons. Added memory-only Zustand session and seat selection state, TanStack Query availability refresh, registration/verification/login, passenger details, API-backed temporary reservation, owned booking history/detail, server-time countdown and TEST-gated checkout handoff. UI selection and login were checked in the browser, and HTTP verification confirmed a 600 EGP two-seat hold and rejection of a second claim. Temporary verification rows were removed afterward. W3 password recovery/account completion and W5 payment result/ticket/own refund activity still require their scheduled frontend batches. Nothing is pushed without the owner's review.

Owner-directed local data replacement — 2026-10-19: no backup was created. All prior public application rows (including accounts, reservations, payment evidence and old catalog) were removed from the verified loopback development database bus_platform. Prisma metadata was retained. Replaced with 7 Egyptian cities, 17 public station names, 36 44-seat buses and 504 development departures across 14 days. Times/fares/fleet are examples, not BlueBus commercial data. The owner removed the local backups folder; it was not re-created.

### Passenger website completion priority — 2026-10-19

The owner reports that the website TEST checkout succeeded. This is user-reported checkout success; independently verify backend confirmation and ticket availability in the next payment/ticket batch before treating the entire website payment journey as complete.

Finish passenger functionality before the dedicated visual/UX polish pass. Next: complete authoritative payment-result handling and the owned ticket/QR page, then password recovery, the account area/session actions, paginated own payment/refund activity with its missing authenticated backend endpoint, booking-history filters supported across the full dataset, and system/help/policy pages (policy text requires owner approval before publication). Keep Arabic/English and basic usability working within each feature; defer minor visual refinement and the comprehensive responsive/accessibility/UX review until functionality is complete. Start the staff dashboard afterward. Deliver cohesive feature batches and keep the existing review-before-push rule. Do not add automated test files under the current owner instruction.

Passenger payment/ticket batch — 2026-10-19: added /checkout/result and /bookings/[bookingId]/ticket, a shared payment-outcome view, owner-scoped ticket reads, backend PNG QR rendering and Arabic/English content. The result route optionally accepts a validated bookingId; all payment success/callback flags are ignored. Without a booking id it links to the owner's booking history, so no transaction-to-booking association is guessed. The restricted local TEST proxy now returns to this result page. Processing/unknown states keep polling after the hold countdown ends; refund state is distinct from confirmation. Ticket display refreshes every 30 seconds while visible and on focus; a fresh unavailable/error response hides cached QR content. QR is a ticket identifier, not boarding authorization.

Verification: TypeScript, lint and production web build passed. A read-only check found a real confirmed booking with a valid ticket/PNG QR and rejected a different owner in the ticket service. Browser checks confirmed Arabic/English result pages and that success=true does not imply payment success. Authenticated browser verification then passed after owner sign-in: the actual paid ticket displayed its QR, Cairo journey times, one passenger/seat and 300 EGP total; no password, new payment, refund or database mutation was used for this batch. W5 passenger-wide payment/refund history and the later account/recovery batches remain outstanding. Changes await review before push.

Payment return correction — 2026-10-19: removed the development browser return's dependency on the temporary tunnel. Each new Intention receives a direct website result URL with the server-owned bookingId; local TEST permits loopback HTTP, while production and webhook ingress retain HTTPS validation. Existing Intention redirect URLs are not rewritten and no new financial operation was sent. Local transport verification checked the actual generated request body, correct booking correlation and production/external-HTTP/webhook rejection. The temporary callback-only tunnel was reopened and checked independently. Real Paymob completion with the newly configured localhost redirect still needs a new user-initiated TEST flow; no successful redirect is claimed from a local transport check alone.

Fixed seat-map correction — 2026-10-19: the owner specified a front door, a WC and a middle entrance after it. Public BlueBus seat-map observation showed pairs 17–18 and 19–20 on the left, with WC opposite 17–18; the owner identified the following right-side space as the middle door. Our complete STANDARD_2_2 44-seat template now reserves those right-side positions for noninteractive WC/door markers and resumes four-seat rows at 21–24. A front-door label/icon is explicit. Seat numbers/ids, availability, selection and all database records are unchanged. Other capacities retain the regular template, and undefined layouts remain numbered-only. Arabic/English preserve the same LTR physical positions, with accessible seat descriptions for the two facility rows.

Verification: 44 unique seat coordinates; browser selection of seat 19 updated the summary to one seat and 280 EGP without creating a reservation; Arabic/English facility descriptions checked. TypeScript, lint and production build passed. A Chrome development hydration warning referenced browser-extension attributes on body, not seat-map markup; no suppression or extension-setting change was introduced.

Front crew clarification — 2026-10-19: the fixed 44-seat template shows the main driver with a steering wheel and a second-driver seat beside it at the front. The second-driver position is a noninteractive crew marker outside the 44 passenger seats. Arabic/English labels and front-door spacing were updated; no passenger ids, numbering, capacity or database records changed. TypeScript/lint passed and the crew/front-door positions were verified in the browser.

Checkout-result freshness correction — 2026-10-19: the return page now opts into a distinct afterCheckout view of the shared owned-booking query. It forces a fresh read on mount and hides cached data until that read finishes. Session restoration and unsettled server results show only a neutral checking state; the old hold countdown and payment CTA never appear on the return page. Pending results refresh every three seconds; confirmed paid results expose the ticket, and final failure/expiry/refund/cancellation states retain their own messages. The payment response's bookingStatus supplies the visible booking state, avoiding a transient contradiction between parallel booking/payment reads. No provider query flags confirm payment.

Verification: a manual in-memory TanStack Query observer check seeded old pending data and verified it remained hidden until a fresh paid response. Browser reload first showed the checking panel rather than the previous reservation/payment form. TypeScript, lint and production web build passed. No database mutation, provider payment or automated test file was introduced.

Immediate payment inquiry on return — 2026-10-19: background reconciliation currently runs at 30-second intervals. Added authenticated POST /bookings/:id/payment/refresh to initiate verification of the owner's existing payment session immediately, independently of its next worker run. It accepts only an empty JSON object, uses server-selected session ids, returns final completed results without provider I/O, and reuses all existing authenticated provider inquiry, exact scope/EGP/amount checks and transactional booking/ticket rules. No new Intention, capture or refund is sent. The endpoint is limited to six requests per minute per authenticated user; GET status remains provider-free.

The checkout-result page requests this check once after its fresh read identifies an unsettled/expired result, then refreshes the owned-booking query immediately on completion. Read polling and the background worker remain fallback paths on provider errors. No arbitrary success flag is trusted and no artificial success delay is used. TypeScript/lint passed; a read of a real completed booking returned PAID in about 20 ms (including ownership rejection verification) and another owner received BOOKING_NOT_FOUND. This completed-record measurement is not an estimate of remote Paymob verification time. A new user-initiated TEST return is still needed to measure end-to-end provider latency.

Payment-checking UI refinement — 2026-10-19: extracted a reusable PaymentChecking component for initial session/data loading and pending payment verification. A centered responsive panel now uses the site's existing navy/blue palette and Arabic font, an indeterminate spinner with reduced-motion support, concise Arabic/English copy, optional booking reference and existing refresh/history actions. Status text is announced politely; no fake progress percentage, estimated completion time or unverified success is shown. Payment verification, redirects and booking data are unchanged. Arabic and English initial-checking views were inspected in the browser; TypeScript/lint passed. The improvement is grouped in one local commit pending review before push.

Passenger password recovery completed — 2026-10-19: added /forgot-password and /reset-password with a shared feature-local PasswordRecovery form, RHF state and Zod validation matching the API. Login exposes Forgot password; normal requests advance directly to code/password entry without putting email, codes or passwords in the URL or browser storage. The reset route also supports direct entry. Generic request/resend messaging avoids account enumeration; the UI provides a 60-second resend cooldown, six-digit code validation, password length/matching checks, translated invalid/expired-code handling and an uncertain-network-result message. A safe internal return path preserves the destination through login/recovery; external redirects are rejected. Successful reset clears local session/cache state without logging in automatically, reflecting the backend's session revocation.

Verification: Arabic request/code UI and English login/recovery links were inspected in the browser. A new isolated local account went through real HTTP registration/verification, Mailpit reset delivery, wrong-code rejection, mismatch rejection, valid reset, new-password login, old-password rejection, access-token revocation and one-time-code reuse rejection. Known/unknown reset requests returned the same generic response, and backend resend throttling was checked. Temporary account rows were deleted after verification; no existing account password or booking was changed. No automated test files or new packages were added. TypeScript/lint and production web build passed. Account profile/session actions, passenger-wide payment/refund history and the later passenger completion/polish batch remain outstanding.

Passenger account completed — 2026-10-19: added protected Arabic/English /account, owner-keyed GET /auth/me profile, shared navigation to booking history, current-device logout and confirmed all-device logout using the existing authenticated API. Session tokens stay in memory; successful logout clears the session and private query cache. No invented device metadata or unsupported profile editing controls were added.

Verification: TypeScript, ESLint and production web build passed. A new isolated local account verified real profile reads, two-session revocation and unauthenticated rejection through HTTP; Arabic/English profile UI, confirmation/cancel, booking navigation and current-device UI logout were inspected. The synthetic account was deleted afterward. No automated test files, packages, backups or changes to existing passenger data were introduced. The feature remains local pending review before push. Next: paginated own payment/refund activity and its authenticated API endpoint.

HttpOnly/BFF and role-based route protection completed — 2026-10-19: replaced memory access tokens and inline protected-page login forms with same-origin /api/backend/[...path], HttpOnly token cookies and a shared refresh/retry helper. The allowlist supports the existing request methods, isolates provider callbacks/internal endpoints, caps JSON bodies at 100kb and validates CSRF/Origin. Login/refresh never expose website tokens in JSON. Requests replay only once after authentication recovery; network/403 errors never replay mutations or log out the owner. Modern browser Web Locks coordinate cross-tab refresh/login/logout without depending on one server process, and a promise coalesces same-tab recovery. Backend strict refresh cookies, rotation and replay revocation remain unchanged.

JWT role claims were added and validated. Website proxy role checks call the backend's authenticated /auth/me so signatures, live sessions and current roles are authoritative without copying signing secrets. Feature-independent protected layout/RequireAuth redirects to locale login with safe returnTo, retains query/seat selection, and shows a retry state for backend outages. Role failures use /forbidden; dashboard role rules are prepared but dashboard pages are not implemented. TanStack Query retains data/cache management; Zustand contains only user/UI state. Cross-tab login/logout broadcasts contain no credentials.

Verification: real local HTTP checks with isolated USER/ADMIN accounts and one temporary city covered cookie HttpOnly flags, tokens absent from JSON, signed role claims, guest redirects/query preservation, role denial, GET/POST/PATCH/DELETE, CSRF rejection, blocked Paymob forwarding, expired access recovery/rotation, immediate role downgrade and logout/invalid refresh. Temporary city/account/audit rows were cleaned. Inline mocked-request checks verified six concurrent requests use one refresh, 403/network behavior and a single body-preserving POST replay. Browser checks cover actual sign-in/returnTo, role denial and expired-session login. No automated test files, new packages, backups or existing passenger data changes were introduced. Production ingress/client-IP rate limiting remains hosting configuration work documented in README; dashboard implementation and payment/refund history remain separate batches.

Final authentication checks: verified actual seat selection survives sign-in and returns to passenger details without creating a booking; an expired synthetic session redirects to the English login with its original query. A separate manual header check confirmed Idempotency-Key reaches the payment-attempt controller (missing owned booking returns BOOKING_NOT_FOUND rather than key validation failure), without creating a payment. BFF 5xx failures now enter the existing uncertain-result handling for reservation/password-reset mutations, and login/logout share the cross-tab refresh lock. A pending profile read is drained before another tab restores a newly signed-in account. Final synthetic accounts and sessions were removed.

Post-authentication cleanup — 2026-10-19: import-reference inspection found no orphan source modules among the 63 website TypeScript files (framework entrypoints accounted for). Consolidated the duplicated public server API client into lib/server/backend.ts and the two trip API modules into features/trips/api.ts; removed lib/api.ts and features/trips/trip-api.ts after updating all callers. Preserved query strings, pagination, the 8-second public-read timeout and ApiResponseError identity for route 404 handling. Removed unused getCities, AuthForm onSuccess/pathname fallback, four obsolete inline-login translation keys per language and unused inline-auth/auth-required styles. Updated the stale browser API URL instructions in README. Remaining authentication files have active callers. Web production build/TypeScript, ESLint and direct query/404/home/guest-redirect checks passed. No packages, tests, database data or deployment settings changed.

Frontend structure alignment — 2026-10-19: inspected the public al-baraka-frontend master tree and its actual shared apiClient/queryClient, feature API/hooks/types/schema files, providers, session route and proxy. Reorganized the website around the same feature/shared/app pattern, with PascalCase components, app/providers.tsx and an auth route group. Browser requests now live in feature api/*.api.ts, TanStack Query queries/mutations in feature hooks, validation/types/store inside their owning features, and shared configuration/transport/layout helpers in shared. Public server data reads remain explicitly server-only. Route URLs are unchanged.

Removed the custom 152-line SessionProvider and 30-line auth Zustand store, duplicated profile reads, Context plumbing, generation/in-flight user-state machinery and BroadcastChannel handling. Current-user data now has one TanStack Query source via useCurrentUser; useLogin/useLogout perform cache updates, with normal focus revalidation instead of immediate tab broadcasts. Seat selection continues using Zustand. Kept HttpOnly token cookies, safe returnTo, current-role verification, coordinated refresh, callback isolation, payment idempotency, pending-result freshness and uncertain mutation handling. The reference's browser-visible/logged token flow was not copied, and no Axios or auth library was added.

Validation: production web build/TypeScript and ESLint passed after the reorganization. Import graph found no orphan source modules (the locale message template is a known dynamic import). Actual account rendering was checked in the browser using the existing session without logging the owner out. A separate synthetic feature-API run covered login/me, seat reads, temporary reservation, owner history/details, unpaid-ticket denial, payment state/inquiry and logout; the temporary booking/seat rows and account/sessions were removed afterward. No provider charge, backup, automated test files or existing passenger data changes. Hosting/client-IP deployment configuration and remaining passenger features retain their previous status.

API simplification completed — 2026-10-19: owner explicitly approved removal of the website API route/method allowlist. Backend routing, authentication, roles and ownership are authoritative. Feature API functions use the central apiClient and feed feature TanStack Query hooks. Server helpers are combined in shared/lib/apiServer.ts. Fixed-destination forwarding, CSRF/Origin validation, JSON size limits, HttpOnly token handling, refresh coordination and payment idempotency remain. Earlier allowlist-specific checks describe the superseded implementation.

Unified feature API — 2026-10-19: all feature requests now use shared/lib/apiClient.ts, including public Server Component reads. tripsApi in trips.api.ts replaces separate server functions. Removed apiServer.ts and apiGet; server-only cookie operations live in authCookies.ts. Server requests do not run browser session refresh or share user session state. A common ApiError preserves backend 404 handling.

## Auth/API refactor — phase 1 completed (2026-10-20)

Owner approved the reviewed response-contract migration in small groups. Applied client compatibility first, then errors/shared helpers, account/session responses, catalogs/trips, booking/payment/ticket HTTP responses, admin responses, and operational/rate-limit responses. Backend services, data models, provider logic and refresh-token rotation are unchanged.

- [x] Shared `{ success, code, message, data?, requestId? }` envelope and backend ar/en code dictionary.
- [x] One general validation message; no raw exception text in public errors.
- [x] Body requestId only for unexpected 5xx; X-Request-ID remains on all requests.
- [x] Paginated data.items/data.pagination and data.search where relevant.
- [x] 200 success envelopes for logout/delete; data.verificationId for registration.
- [x] Client/gateway compatibility and Accept-Language forwarding; removed frontend API-error translation table.
- [x] All rate-limit handlers use the central localized error handler, including the previously default-text admin statistics limiter; original limits retained.
- [x] Server-only apiFetch/ApiResult and shared refresh helper.
- [x] Backend live-session/current-role verification and pre-render refresh in proxy (updated 2026-10-21).
- [x] Server Actions for existing web mutations with authentication/permission checks inside each action.
- [x] Server Component reads, one GET payment-status polling route, and removal of legacy gateway/browser refresh after migration.

Checks use inline HTTP/scripts rather than stored test files. Group checks cover auth (injected services), live catalog/search compatibility, injected booking/payment/ticket/idempotency/webhook acknowledgement, role guards, readiness, 429 Retry-After, and safe parser errors. No database writes, backups, real account actions, emails, provider transactions or deployment. Final validation passed: API production build, web production build/TypeScript and root ESLint; injected HTTP checks for all groups and unexpected 500 requestId correlation; live catalog/search, Arabic/English SSR and guest rejection; client support-reference display, paginated compatibility and no retry for uncertain POST failures. No automated test files were added.

Strict token rotation remains. An in-memory single-flight map is a single-process coordination mechanism, not sufficient by itself for multiple server replicas or late old-token requests; no grace window, asymmetric-token change or shared-secret copy was introduced in phase 1.

Auth/API refactor — phase 2 completed (2026-10-20): added server-only apiFetch and shared ApiResult/ApiError. The gateway delegates all backend transport, strips token replies into HttpOnly cookies and preserves CSRF/Origin checks, body limits and Idempotency-Key. Removed browser refresh/Web Locks. Public trip/catalog page queries now use trips.queries.ts; browser seat queries remain transitional. Protected GET recovery repeats once; protected mutations authenticate/renew via auth/me before sending the actual mutation once. Cookie writes require an explicit writable-context callback. Confirmed refresh 401 clears the session; transient refresh failures preserve it. An in-flight Map merges matching refreshes only within the current runtime and deletes settled entries; multi-instance and late-old-token coordination remain unresolved. No grace period was added.

Validation passed: web TypeScript, root ESLint and production build; isolated concurrent-refresh checks (eight requests sharing one renewal), real gateway-to-injected-Express checks (six concurrent reads), login token redaction/HttpOnly cookies, CSRF/body limits, payment mutation sent once with idempotency preserved, transient/invalid refresh behavior, Arabic/English public SSR, search and trip 404. No saved test files, real account writes, provider payments, database changes or dependencies were introduced. Server transport identifiers were absent from browser chunks. Proxy still uses backend auth/me; local JWT/pre-render renewal and the remaining reads/actions/polling migration are pending. Historical browser-refresh notes above describe superseded implementations.

Auth/API refactor — phase 3 completed (2026-10-20): authMiddleware now verifies access JWT locally using jose with the backend's exact hex-decoded HS256 key, issuer/audience/type, required claims, identity/session UUIDs, token purpose and role validation. Protected navigation no longer requests auth/me. Missing/invalid/expired access renews through apiFetch's shared helper, then checks roleRoutes before rendering. Updated request cookies reach the same render through next-intl; outgoing HttpOnly cookies survive locale rewrites/redirects. Invalid sessions redirect to login with returnTo and clear cookies; transient refresh failures return 503 while retaining cookies. Missing/invalid signing configuration fails closed and logs no secrets. Backend live-session/current-role checks and all business logic remain unchanged. The role in the JWT may lag database role changes up to 15 minutes, with Express still authoritative.

Added jose as a direct web dependency and AUTH_ACCESS_SECRET to the env example; the actual matching development key stays only in ignored apps/web/.env.local. Production build, TypeScript, ESLint and isolated checks using actual jose/next-intl passed: guest/role redirects, signature/issuer/audience/purpose/expiry/session-claim rejection, six concurrent requests sharing one renewal in one runtime, same-render Cookie plus locale forwarding, new-cookie retention on redirects, invalid-refresh cleanup, transient failures and missing-key rejection. No saved test files, database writes, real sessions/provider calls or backend changes. Single-flight across separate proxy/handler instances and late old-token requests remains unresolved; no grace window was added. Next: feature-by-feature Server Actions and Server Component migration, then remove the legacy gateway except payment polling.

Auth/API refactor — phase 4, authentication mutations completed (2026-10-20): added seven exported auth Server Actions with runtime schema validation and fixed backend paths through apiFetch. Shared updateAuthCookies writes the same HttpOnly cookies from the action context; login results remain user-only, registration returns verificationId, and logout/reset clear cookies only on confirmed outcomes. Logout-all authenticates inside the action using apiFetch's live auth/me preflight (including refresh-before-write); public login/register/verification/recovery actions remain public, and current logout uses its refresh credential. Existing React Query mutations/forms now call action adapters instead of generic gateway POSTs. Adapters preserve ApiError, session-expiry cache clearing and uncertain network outcomes, with no automatic retry. auth/me remains a transitional browser GET until the account Server Component migration. Backend validation/rate limits/business rules are unchanged.

Checks passed: web TypeScript, root ESLint, production build; isolated action validation/session/refresh cases; actual production Next HTTP action requests against a fake API for every auth mutation, ar/en language, HttpOnly/Secure cookies, token redaction, direct unauthenticated logout-all denial from a public page, logout/reset cookie cleanup, invalid input, cross-origin rejection and a lost upstream connection sent once. Browser adapters preserve form results and uncertain-error/session-expiry behavior. No saved tests, dependencies, database writes, real sessions or payment calls. Remaining: booking/payment Server Actions, server account/booking/ticket reads, single GET payment polling and final legacy gateway/browser client removal. Existing single-flight runtime/late-token limitation remains.

Auth/API refactor — phase 5, booking/payment mutations completed (2026-10-20): added createBookingAction, checkoutAction and refreshPaymentAction plus strict runtime schemas. Reservation authenticates before one write; checkout/inquiry verify booking ownership inside the action and retain backend ownership/payable-state enforcement. Checkout retains the client-generated UUID Idempotency-Key, prepares once when needed, continues only after success or known 409 PAYMENT_ATTEMPT_EXISTS, then starts checkout once. Uncertain failures/5xx or expired preparation stop the action without another write. The provider inquiry is an explicit one-time mutation, not status polling. Booking hooks disable reservation/checkout retries explicitly. Auth and booking adapters share apiClient.invokeAction, preserving user-facing contracts, ApiError, uncertain results and session-expiry cache clearing. All current feature mutations now use Actions; legacy gateway usage remains for reads.

TypeScript, ESLint and production web build passed. Isolated checks and real production Next HTTP requests against a fake API covered malformed/duplicate passenger input, direct guest calls from a public trip page, ownership denial, refresh-before-create and HttpOnly cookies, reservation conflicts, ar/en forwarding, exact idempotency key, known-attempt recovery, expired/uncertain preparation stopping checkout, no replay after lost checkout response, owner-only inquiry, cross-origin rejection and shared adapter compatibility with auth. No real bookings/provider calls, database writes, dependencies, saved tests or backend changes. Remaining: server account/booking/ticket reads, dedicated GET payment polling, legacy gateway removal and remaining browser-read migration. Runtime-only refresh coordination limitation remains.

Auth/API refactor — phase 6, account/history/ticket reads completed (2026-10-20): added server-only auth/bookings/tickets query modules through apiFetch. Cached current-user validation is request/render-scoped, not global. The private layout checks the live session on the server, and each private reader also requires the same cached user before fetching data because page/layout work can run in parallel. Profile data renders from server props; booking history and ticket views render on the server. History pagination uses validated URL offset and 20-row backend pages. Ticket manual/30-second visible/focus refresh uses router.refresh, without Server Actions for reads or another API route. Removed old list/ticket hooks/API modules and unused query keys. Shared ReadError/RefreshPage handle recoverable server read errors and refresh.

The proxy overwrites x-bus-return-to with the actual internal path/query, preserving safe login returnTo for revoked backend sessions. Login-page existing-session redirects now use a server lookup; post-login navigation uses the safe destination directly, avoiding stale browser-cache redirect loops. Logout refreshes server content. Backend authority, models, payment rules and cookies remain unchanged. Header/session, booking-detail/payment and seat browser reads remain transitional; legacy gateway deletion and the single payment-status GET route are pending.

Validation passed: production web build/TypeScript, root ESLint and real HTTP calls to a temporary production Next server using a fake API. Confirmed initial account/history/ticket HTML, two-user isolation, per-render auth deduplication, same-render proxy renewal, minimal user fields/no raw QR-payload serialization, URL pagination/empty/404, direct guest/revoked-session redirects with query preservation despite a spoofed header, backend outage/support-id handling without cookie clearing, safe login destinations and working logout cookies. No saved tests, real data/provider actions, database changes or dependencies. Runtime-only refresh coordination limitation remains.

Auth/API refactor — phase 7, final website migration completed (2026-10-20): booking detail/result now read an owner-scoped snapshot through server queries and render confirmation immediately when known. The only Route Handler is GET /api/payments/[bookingId]/status, returning status plus availability without checkout URL/credentials or provider-side work. Existing one-time reconciliation is an Action; polling/readonly renders never invoke Paymob. Older cached/in-flight pending data cannot overwrite a fresher server/reconciliation view; payment/refund polling uses 3/5-second intervals only while needed. Auth user/error state is hydrated into the existing TanStack Query cache per server render and observed with skipToken; no browser auth/me fetch, auth Context or duplicate Zustand user store. Public authenticated pages also renew before render. Seat props refresh through visible 15-second/manual router.refresh while Zustand selection persists; actual reservation conflicts remain enforced atomically by Express. Global focus/visibility refresh is debounced once. Deleted generic API gateway, browser trips API/hook and all generic apiClient HTTP methods; apiClient now only adapts action results and fixed payment GETs.

Validated production build/TypeScript, root ESLint, isolated ordering checks and real HTTP against an isolated fake API: paid/pending SSR independent of provider flags, owner/session/origin/method/UUID validation, old gateway 404, six callers/one refresh in one handler runtime, HttpOnly/token redaction, transient/invalid refresh, rate-limit Retry-After, unexpected requestId, public-page renewal, session hydration and two-user isolation. Chrome sandbox verification covered login/returnTo, immediate paid result, seat selection surviving server refresh, hydrated passenger form, one fake reservation navigation, explicit inquiry updating the result and logout redirect preserving returnTo. No hydration errors observed. Closed only sandbox tab/processes. No real provider/database/user actions, dependencies or saved tests were added. All agreed website migration checkboxes are complete. Backend strict rotation stays unchanged; multi-instance/separate-runtime and late-old-token refresh coordination remains unresolved before production deployment. No grace window or token-model change was introduced.

## الخطة الموحدة لواجهة الركاب — 2026-10-20

الحالة: قيد التنفيذ على دفعات. سجل التنفيذ في نهاية هذا القسم يوضح ما اكتمل وما بقي.

تجمع هذه النسخة أحدث قرارات المستخدم وتحل محل المقترحات المتعارضة في نقاش إعادة تنظيم الواجهة. المشروع الفعلي موجود في `D:\personal-projects\bus-booking-platform`. هذه هي الخطة المعتمدة الحالية داخل المشروع، وتلغي المقترحات المتعارضة الأقدم المتعلقة بتنظيم الواجهة.

## 1. الهدف والنطاق

- تنظيم الموقع كما لو بدأناه من الصفر، ونقل التنفيذ الحالي إليه تدريجيًا.
- بنية حسب الميزات، وأسماء مألوفة، ومسؤولية واضحة لكل ملف.
- إعادة استخدام المكوّنات والمنطق المشترك عند وجود حاجة فعلية؛ لا إنشاء ملف لكل دالة أو مجلدات فارغة.
- إكمال موقع الركاب، ثم مراجعة التصميم وUX، ثم الانتقال إلى Dashboard.
- استخدام العربية في الشرح، وشرح التغييرات والكود بعد كل مرحلة.
- الحفاظ على وظائف الحجز والمقاعد والدفع والتذاكر الحالية أثناء التنظيم.
- لا تغيير قواعد Backend أو نموذج Session أو قاعدة البيانات لمجرد إعادة ترتيب الواجهة.

## 2. القرارات النهائية

| الموضوع               | القرار المعتمد                                                                 |
| --------------------- | ------------------------------------------------------------------------------ |
| الإطار                | Next.js App Router وTypeScript                                                 |
| التصميم               | Tailwind utilities داخل JSX                                                    |
| المكوّنات             | shadcn/ui لكل مكوّن مناسب متاح نحتاجه؛ مكوّنات أعمال مخصصة عند الحاجة          |
| النماذج               | React Hook Form وZod مع Form وحقول مشتركة                                      |
| كاش API               | TanStack Query فقط                                                             |
| fetch                 | إرسال الطلبات باستخدام `cache: 'no-store'`                                     |
| طلبات الميزات         | Hook → Server Action → auth.server عند الحاجة → api.ts → Backend               |
| مجلد api داخل Feature | غير مطلوب؛ لا wrapper يكرر استدعاء Action                                      |
| خيار auth             | محذوف من واجهة apiFetch                                                        |
| Access Token          | تقرأه وحدة auth وتُمرره صراحة إلى عميل HTTP                                    |
| Refresh Token         | يستخدم فقط في عمليات الجلسة المناسبة                                           |
| تخزين التوكنات        | HttpOnly Cookies على نطاق تطبيق الويب                                          |
| حماية التنقل          | middleware منظمة، تُشغَّل من proxy.ts                                          |
| الصلاحيات النهائية    | Backend، مع تحقق Actions الخاصة من الجلسة والصلاحيات                           |
| متابعة الدفع          | استثناء GET الحالي؛ لا ننفذ polling المتكرر عبر Actions                        |
| الحالة المحلية        | useState/useReducer؛ لا Zustand أو متجر مستخدم إضافي                           |
| الاختبارات            | لا ملفات اختبارات آلية جديدة حاليًا؛ تحقق الأنواع وLint والبناء وتجربة المتصفح |
| Git                   | commits مترابطة؛ لا push قبل موافقة صريحة؛ لا أسرار أو ملفات build             |

لا Next Data Cache أو `force-cache` أو `next.revalidate/tags` أو `updateTag/revalidateTag` لبيانات API. هذا لا يمنع كاش الأصول الثابتة مثل الصور والخطوط وJavaScript.

## 3. الأدوات

نحتفظ بـNext.js، React، TypeScript، Tailwind، next-intl، TanStack Query، React Hook Form، Zod، Lucide وfetch.

عند تنفيذ الأساس نضيف shadcn ومكوّناته وتبعياته حسب الحاجة، و`@hookform/resolvers` لربط Zod بالنماذج، و`clsx`/`tailwind-merge` لدالة `cn` إذا احتاج إعداد shadcn ذلك. لا Axios أو مكتبة حالة بديلة، ولا تثبيت كل مكوّنات shadcn مقدمًا.

نضبط `components.json` على `shared/components/ui` ودالة `shared/lib/cn`، ونختار عائلة primitives متسقة خلال إعداد shadcn.

## 4. الهيكل العام

```text
apps/web/
  public/
    images/
    icons/
  src/
    app/
      [locale]/
        layout.tsx
        page.tsx
        loading.tsx
        error.tsx
        not-found.tsx
        (auth)/
          login/page.tsx
          forgot-password/page.tsx
          reset-password/page.tsx
        trips/
          page.tsx
          [tripId]/page.tsx
        (protected)/
          layout.tsx
          account/page.tsx
          bookings/
            page.tsx
            [bookingId]/
              page.tsx
              ticket/page.tsx
          checkout/result/page.tsx
        forbidden/page.tsx
      api/payments/[bookingId]/status/route.ts
      providers.tsx
      globals.css
    features/
      auth/
      trips/
      seats/
      bookings/
      tickets/
      account/
    shared/
      components/
        ui/
        forms/
        layout/
        feedback/
      lib/
        api.ts
        clientIdentity.ts
        apiResult.ts
        parseSchema.ts
        queryClient.ts
        cn.ts
        format.ts
    middleware/
      authMiddleware.ts
      intlMiddleware.ts
      roleRoutes.ts
      runMiddlewares.ts
    i18n/
      routing.ts
      navigation.ts
      request.ts
    messages/
      ar.json
      en.json
    proxy.ts
  components.json
  next.config.ts
  next-env.d.ts
  postcss.config.mjs
  tsconfig.json
  package.json
  .env.example
  .env.local
```

المسارات الحالية محفوظة؛ التسجيل والتحقق يمكن أن يبقيا خطوات داخل شاشة المصادقة بدل إضافة URLs جديدة. `app` يركب الصفحة ويمرر بيانات المسار، ولا يحتوي تفاصيل أعمال الميزات.

### توزيع ملفات الميزات

| Feature  | Actions             | Hooks                                                                                                          | المكوّنات/الصفحات الأساسية                                                                                                                                                                                             |
| -------- | ------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| auth     | auth.actions.ts     | useAuth/useLogin/useLogout/useRegister/useVerifyEmail/useResendVerification/useForgotPassword/useResetPassword | forms: AuthFlow/LoginForm/RegisterForm/VerifyEmailForm؛ password-recovery: PasswordRecovery/PasswordRecoveryFlow/ResetPasswordForm؛ navigation: AccountMenu/HeaderNavigation؛ إطار صفحات الدخول والاستعادة على السيرفر |
| trips    | trips.actions.ts    | useTripCatalog/useTripSearch/useTripDetails                                                                    | HomeHero/PopularRoutes/HomeSections على السيرفر؛ HomeSearch/TripSearchForm/TripResults/TripDetails للأجزاء التفاعلية                                                                                                   |
| seats    | seats.actions.ts    | useSeatBooking                                                                                                 | SeatBooking للعرض؛ SeatMap/SeatIcon/PassengerForm؛ hook يملك الاختيار والتوافر وإنشاء الحجز                                                                                                                            |
| bookings | bookings.actions.ts | useBookings/useCreateBooking/useCheckout/useBookingPayment                                                     | BookingDetail يعرض المحتوى الثابت على السيرفر ويمرره إلى BookingPayment؛ BookingHistory/PaymentStatus/PaymentChecking                                                                                                  |
| tickets  | tickets.actions.ts  | useTicket                                                                                                      | صفحة السيرفر تقرأ التذكرة وتزيل QR payload ثم تمرر البيانات إلى TicketView                                                                                                                                             |
| account  | يستخدم Auth         | useLogout من Auth                                                                                              | بيانات الحساب في صفحة السيرفر؛ AccountSessions لإجراءات الجلسة فقط وAccountNavigation للتنقل                                                                                                                           |
| stations | يستخدم كتالوج Trips | useTripCatalog من Trips                                                                                        | مقدمة وخاتمة صفحة السيرفر، StationDirectory للفلاتر والنتائج                                                                                                                                                           |
| faqs     | لا اتصال API        | حالة محلية للبحث والتصنيف                                                                                      | مقدمة وخاتمة صفحة السيرفر، FaqContent للبحث والإجابات                                                                                                                                                                  |

داخل Feature مجلدات actions/hooks/components/schemas/types/lib/store حسب الحاجة فقط. أسماء مفاتيح TanStack موحّدة في hooks/queryKeys.ts لكل ميزة تملك طلبات: auth/trips/seats/bookings/tickets. تستخدمها Hooks والتهيئة والتحديث والإبطال؛ مفاتيح البيانات الخاصة تتضمن هوية المستخدم واللغة ومعرّف المورد. لا ملف Query Keys لميزة لا تملك طلبات خاصة بها.

القراءة الأولية التي تستخدمها صفحة واحدة تبقى داخل صفحة Server Component عبر readApi دون كتابة cookies. تبقى ملفات lib/*.server.ts عندما تُشارك قراءة فعلية بين أكثر من صفحة أو Action، مثل تجميع كتالوج المدن/المحطات وتفاصيل الحجز. لا HTTP client ثانٍ ولا Route Handler عام. إعداد retry: false موحد في queryClient.ts، وstaleTime الخاص بالميزة قريب من hook.

مكوّنات المشروع PascalCase، والـHooks تبدأ بـuse. مكوّنات shadcn تحت ui تحتفظ بأسماء ملفات CLI مثل `button.tsx`.

`shared` لا يستورد تفاصيل Feature. التكامل بين الميزات يستخدم عقدًا صغيرًا واضحًا أو props من المكوّن الجامع، وليس الوصول العشوائي إلى ملفاتها الداخلية. لا repositories أو factories عامة أو barrel files تجمع شجرة المشروع.

## 5. مسؤوليات ملفات الاتصال والجلسة

### shared/lib/api.ts — نقل HTTP فقط

- `apiFetch` ينفذ fetch واحدًا إلى API_BASE_URL الثابت، مع JSON واللغة وtimeout/AbortSignal وno-store ورفض redirects والتحقق من envelope.
- يقبل credentials صراحة من مستدعٍ server-only، ويحذف Authorization/Cookie وبيانات الهوية العشوائية من headers الإضافية. يحافظ على Idempotency-Key وRetry-After وrequestId الآمن وCSRF وتوقيع الهوية عبر clientIdentity.
- يعيد دائمًا `{ result, headers }` للسيرفر. الطلبات المعتادة تستخرج result، وlogin/refresh يقرآن headers لاستخراج Set-Cookie؛ لا توجد دالة requestApi أو خيارات تغيّر شكل الرد، ولا تعاد Headers الخام إلى المتصفح.
- لا يقرأ cookies، ولا يصنّف endpoints، ولا يستدعي نفسه للتحقق، ولا يجدد الجلسة أو يعيد إرسال الطلب.

### features/auth/lib/auth.server.ts — الجلسة

دُمجت فيه session.ts وrefreshSession.ts، وحُذف الملفان من shared/lib. يستورد api.ts مباشرة؛ عميل HTTP لا يستورد ميزة Auth.

| الدالة                                               | الاستخدام                                                                                                                     |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| readApi                                              | قراءة SSR أو endpoint عام مع access المتاح؛ دون تجديد أو كتابة cookies                                                        |
| authenticatedFetch                                   | Actions وRoute Handler المحمية؛ GET يجدد مرة عند 401/UNAUTHENTICATED، والكتابة تتحقق عبر auth/me قبل إرسال mutation مرة واحدة |
| readWithSession                                      | نفس سياسة GET للجلسة الصريحة داخل proxy؛ يعيد النتيجة والتوكنات المطلوب حفظها أو null للحذف                                   |
| sessionTokens / updateAuthCookies                    | استخراج بيانات login/refresh والتحقق منها، ثم حفظ أو حذف cookies داخل Action/Handler                                          |
| readAuthCookies / saveAuthCookies / clearAuthCookies | أسماء cookies وخيارات HttpOnly/Secure/Lax/Path؛ proxy يكتب إلى NextResponse ويمرر التجديد لنفس render                         |
| getCurrentUser / requireCurrentUser                  | قراءة المستخدم الآمنة مع React cache داخل الطلب فقط                                                                           |

فشل الشبكة أو 403 أو 5xx لا يطلق تجديدًا ولا يمسح الجلسة. إذا نجح التجديد وفشل GET التالي مؤقتًا، تُحفظ cookies الجديدة. كتابة مجهولة النتيجة لا تتكرر تلقائيًا. يجمع Map المحلي refresh المتزامن، ويظل تنسيق Express عبر قفل PostgreSQL واسترجاع successor خلال 30 ثانية كما هو؛ الطلبات المتأخرة خارج النافذة تظل مرفوضة وفق السياسة الحالية.

### features/auth/actions/auth.actions.ts — نتائج العمليات صريحة

الدخول: validate → apiFetch('auth/login') → readSessionFromResponse → updateSessionCookies → user فقط. الخروج الحالي يرسل refresh إلى الإبطال؛ الخروج من الجميع يمر عبر authenticatedFetch. النجاح المؤكد في الخروج أو reset-password يمسح cookies؛ بقية عمليات التسجيل والتحقق والاستعادة تستخدم submit الصغير المشترك للتحقق والإرسال.

```ts
// داخل Server Component: قراءة فقط.
const booking = await readApi<Booking>('bookings/' + id);
// داخل Action بعد التحقق من المدخلات: تحقق/تجديد ثم كتابة واحدة.
return authenticatedFetch<Booking>('bookings', { method: 'POST', body: data });
```

### apiResult.ts — مشترك للسيرفر والمتصفح

- نوع `ApiResult` لنجاح/فشل العملية وcode/message/data/status وrequestId عند اللزوم.
- `ApiError` موحد للواجهة.
- مساعد `invokeAction` يحول نتيجة Action الفاشلة إلى خطأ يفهمه TanStack ويعيد البيانات عند النجاح.
- يعالج تعذر الوصول إلى Action دون إعادة إرسال العملية تلقائيًا.
- لا أسرار أو Cookie APIs أو استيرادات server-only أو window events. يعالج AppProviders انتهاء الجلسة عبر QueryCache/MutationCache، ويفرغ resetAuthCache بيانات الحساب قبل router.refresh.
- التفرع البرمجي حسب code، والعرض حسب message المترجمة؛ requestId للأخطاء غير المتوقعة.

### parseSchema.ts — server-only

- مساعد موحّد لتحليل مدخلات Server Actions باستخدام schema المالكة للميزة.
- يقبل schema وinput من نوع unknown، ويستخدم safeParseAsync لدعم refinements المتزامنة وغير المتزامنة.
- عند النجاح يرجع { success: true, data } مع النوع الناتج من schema، بما فيه transforms/defaults.
- عند الفشل يرجع { success: false, error }؛ error هي ApiResult عامة مترجمة عبر validationError. لا تُرسل issues أو القيم المدخلة للعميل.
- Actions الخاصة بالمصادقة والحجوزات والرحلات والمقاعد والتذاكر تستعمله وتُرسل parsed.data فقط إلى apiFetch. التحقق من offset أصبح schema في Feature الحجوزات بنفس الحدود السابقة.
- لا ينفذ HTTP أو مصادقة أو تغيير Cookies. تحقق الاستجابات وRHF يظلان في سياقهما؛ لا نبدّل أخطاء upstream بخطأ input من نوع 400.

## 6. تدفق القراءات والكتابة

```text
Component/Form
  → Feature hook: useQuery أو useMutation
  → Feature Server Action
  → auth.server: authenticatedFetch للعمليات المحمية
  → api.ts: apiFetch → { result, headers }
  → Express
  → ApiResult
  → invokeAction
  → TanStack
  → UI
```

- Actions تبدأ بـ`'use server'`، وتصدر دوال async محددة مثل getTripsAction/createBookingAction.
- كل Action تربط endpoint معروفًا وتتحقق من المدخلات؛ لا نصدر Action عامة تمرر أي مسار أو method من المتصفح إلى Backend.
- القراءة العادية تستخدم useQuery مع Action. كتابة الحجز أو بدء الدفع تستخدم useMutation مع Action.
- استدعاء Action من المتصفح POST حتى لو كان طلب Next إلى Backend GET. لا ندعي أنه GET endpoint أو أن استدعاءات Actions لها نفس توازي وجدولة طلبات GET المستقلة.
- لا نقل polling المتكرر إلى Actions: يبقى GET الدفع الحالي، ومساعده الصغير بجوار hook الدفع. هذا لا يبرر مجلد api لكل Feature أو gateway عام.
- إلغاء Query في المتصفح لا يضمن إيقاف Action على السيرفر؛ timeout وحماية النتائج القديمة يلزمان بحسب التدفق.
- قراءات SSR اللازمة تبقى في ملف server-only داخلي واضح. عند الحاجة إلى متابعة بيانات SSR في العميل، نهيئ TanStack عبر QueryClient خاص بالطلب وHydrationBoundary.

## 7. TanStack وملكية الحالة

- QueryClient مستقر داخل المتصفح، ومنفصل لكل طلب SSR؛ لا بيانات مستخدم في متغير module مشترك.
- query keys/options قرب hooks الخاصة بالميزة؛ queryClient.ts للإعداد العام فقط.
- المفاتيح تشمل locale وsearch/filter/pagination عندما تغير النتيجة، وuserId للبيانات الخاصة.
- لا تخزين دائم للبيانات الخاصة أو التوكنات في localStorage. إزالة البيانات الخاصة عند logout أو تبديل المستخدم.
- `staleTime` حد اعتبار البيانات حديثة، وليس مؤقتًا للتحديث الدوري.
- `refetchInterval` للمتابعة الدورية عند الحاجة، ويتوقف حسب حالة الدفع أو مغادرة الشاشة.
- `gcTime` لتنظيف Queries غير المستخدمة.
- البداية المقترحة: كتالوج المدن/المحطات staleTime خمس دقائق؛ البحث والمقاعد والدفع staleTime صفر مع قواعد refetch محددة للواجهة. تضبط القيم داخل Feature.
- الكتابة `retry:false`؛ لا retry خفي في fetch، خصوصًا للدفع والنتائج غير المؤكدة.
- بعد mutation نختار cache update أو invalidateQueries حسب الرد، ولا ننفذ تحديثات متعددة بلا حاجة.
- router.refresh عند الحاجة لإعادة عرض Server Components فقط؛ ليس إبطالًا لكاش TanStack.

| الحالة                           | المسؤول                      |
| -------------------------------- | ---------------------------- |
| قيم وأخطاء النموذج               | React Hook Form              |
| بيانات السيرفر التفاعلية         | TanStack Query               |
| المقاعد المختارة داخل تدفق الحجز | useState داخل useSeatBooking |
| البحث والفلاتر ورقم الصفحة       | URL                          |
| فتح نافذة/إظهار كلمة المرور      | useState                     |
| التوكنات                         | HttpOnly Cookies             |

كل fetch لبيانات API يستخدم no-store، وردود API في Next تمنع HTTP/CDN caching أيضًا. لا تمنع قراءة Cookies كاش TanStack؛ لكنها قد تجعل server render ديناميكيًا، وهذا مقبول في الخطة.

## 8. المصادقة وتجديد الجلسة

1. Form يتحقق من المدخلات؛ Action يعيد التحقق منها.
2. طلب تسجيل الدخول إلى Express، الذي يتحقق من الحساب وينشئ Session.
3. Next يستقبل Access في رد JSON وRefresh عبر Set-Cookie وفق عقد Backend الحالي.
4. أدوات الجلسة تحفظ Cookies على نطاق موقع الويب.
5. لا تعود التوكنات إلى المتصفح ضمن JSON/Action/RSC/HTML؛ تعود بيانات المستخدم الآمنة.
6. المتصفح يرسل Cookies إلى Next تلقائيًا، وNext يضيف Bearer إلى الاتصال بـBackend حتى لو كان على نطاق مختلف.
7. Backend يتحقق من JWT وSession والمستخدم والدور والملكية لكل عملية خاصة.
8. returnTo داخلي ومتحقق منه، مع fallback آمن.

إرسال Access تلقائيًا لا يفرض auth/me قبل كل عملية عامة. Actions الخاصة تطلب التحقق المركزي اللازم، والـBackend يفرض الحماية. إرسال طلب بلا توكن لا يجعل endpoint خاصًا عامًا.

- كلمة مرور خاطئة في login ليست سببًا لتجديد أو حذف جلسة أخرى.
- لا Refresh بسبب403 أو429 أو5xx. outage لا يعني logout.
- GET فشل بجلسة UNAUTHENTICATED يمكن تجديده مرة واحدة وإعادة القراءة مرة واحدة في سياق يسمح بكتابة Cookies؛ refresh نفسه لا يدخل loop.
- قبل mutation خاصة نجهز الجلسة ونرسل الكتابة مرة واحدة. انتهاء التوكن أثناءها أو فقد الرد لا يبرر تكرار الدفع تلقائيًا.
- Refresh Token لا يرفق بكل طلب؛ فقط عمليات الجلسة المناسبة.
- كتابة Cookies مسموحة في Action/Handler/Proxy؛ لا أثناء Server Component render.
- logout يبطل الجلسة ثم يمسح Cookies وكاش المستخدم؛ لا ندعي نجاح logout-all على Backend إذا لم يصل الرد.
- نموذج Session وHS256 وstrict rotation الحالي محفوظ؛ لا grace window جديدة.

**بند نشر غير محلول:** single-flight الحالي ينسق داخل runtime واحد فقط؛ لا يغطي عدة replicas أو runtimes مختلفة أو طلبًا متأخرًا يحمل Refresh قديمًا. لا نعلن حل ذلك عبر إعادة ترتيب الملفات؛ يلزم قرار مستقل قبل اعتماد النشر.

## 9. Middleware وProxy

| الملف             | المسؤولية                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------- |
| roleRoutes.ts     | جدول المسارات الخاصة والأدوار، ومطابقة المسارات                                               |
| authMiddleware.ts | قراءة الدور والجلسة من Backend عبر apiFetch وتجديد قبل العرض والقرار login/forbidden/continue |
| intlMiddleware.ts | اللغة والـrewrite مع حفظ Cookies والـheaders اللازمة                                          |
| runMiddlewares.ts | التشغيل بالترتيب وتمرير الرد والتوقف عند redirect/error                                       |
| proxy.ts          | تشغيل السلسلة وتعريف matcher فقط                                                              |

```ts
export default function proxy(request: NextRequest) {
  return runMiddlewares(request, [authMiddleware, intlMiddleware]);
}
```

- الزائر يدخل الصفحات العامة؛ الصفحة الخاصة تعيده إلى login مع returnTo آمن.
- access منتهي مع refresh صالح: تجديد مركزي، وتمرير التوكنات الجديدة إلى render الجاري وإلى الرد.
- عند وجود Cookies جلسة، يقرأ Middleware المستخدم والدور الحالي من Backend عبر GET auth/me باستخدام apiFetch وno-store. لا يقرأ الدور من JWT محليًا ولا يحتاج مفتاح توقيع في الويب. الزائر في الصفحة العامة لا يسبب طلب تحقق.
- دور غير مسموح: forbidden؛ تغييرات الدور أو إلغاء الجلسة تطبق في طلب التحقق التالي من السيرفر. لا نضع الدور في كاش مستقل.
- فشل تجديد مؤكد401 ينهي الجلسة؛ مشكلة خدمة تحفظ Cookies وتعرض 503 دون تمرير الصفحة المحمية. إذا نجح التدوير ثم فشلت قراءة المستخدم التالية، تُحفظ Cookies المجددة في رد 503 لتجنب ترك المتصفح بالتوكن القديم.
- intl لا يمحو Cookies المجددة، ولا تستبدل مرحلة لاحقة redirect/error صادرًا قبلها.
- الاستثناءات في matcher لا تعفي Actions أو Handler من التحقق الداخلي.
- الردود الخاصة أو التي تجدد الجلسة لا توضع في كاش HTTP مشترك.

## 10. shadcn وTailwind والمكوّنات

- ui يحتوي المكوّنات المضافة من shadcn بأسماء CLI: button/input/field/select/checkbox/dialog/sheet/badge/alert/skeleton وغيرها عند الحاجة.
- forms يبني الربط المشترك مع RHF؛ لا يعيد رسم Input وField الموجودين.
- layout للـHeader/Footer/Container؛ feedback لحالات التطبيق المركبة من أساسيات shadcn.
- TripCard/SeatMap/BookingSummary/TicketView مكوّنات ميزات مخصصة.
- theme tokens والألوان والخطوط ثابتة؛ className يحمل التخطيط والاستجابة والحالات.
- لا إعادة كتابة مجموعة CSS كبيرة عبر @apply، ولا أسماء Tailwind مركبة ديناميكيًا لا يستطيع اكتشافها.
- ربط `cn` في مكان واحد؛ variants بسيطة؛ لا غلاف عام لكل مكوّن دون وظيفة.
- RTL/LTR باستخدام اتجاهات منطقية، وتحقق من ترتيب المقاعد الفيزيائي.
- globals.css للاستيراد والثيم والأساسيات والطباعة والحركات الضرورية فقط؛ حذف selector بعد نقل كل مستخدميه.

## 11. النماذج المشتركة

Form يهيئ useForm وzodResolver وFormProvider وhandleSubmit ويعرض خطأ الإرسال العام. يستقبل schema/defaultValues/onSubmit/children، ولكل نموذج instance مستقل.

- FormInput/FormSelect/FormCheckbox تربط مكوّنات shadcn عبر useFormContext.
- register للعناصر الأصلية، وController/useController للعناصر المتحكم فيها حسب واجهتها.
- استخدام Field/FieldLabel/FieldDescription/FieldError؛ ربط id وlabel وaria-invalid وaria-describedby.
- أسماء الحقول typed، ومراعاة اختلاف Zod input/output مع transforms، دون any لإخفاء المشكلة.
- SubmitButton مبني على shadcn Button ويقرأ isSubmitting؛ أزرار غير الإرسال type=button صريح.
- onSubmit ينتظر mutateAsync حتى لا تنتهي حالة الإرسال مبكرًا.
- خطأ الإرسال يعرض مرة واحدة، ولا toast مكرر فوق نفس الخطأ بلا داعٍ.
- schema وترجمة الأخطاء وقواعد الأعمال والنجاح والتنقل/reset داخل Feature.
- نموذج البحث يحول القيم إلى URL؛ ليس كل Form عملية mutation.
- حقول الركاب الديناميكية تحتفظ بأسماء المقاعد الباقية عند تعديل الاختيار أو تحديث التوافر.
- لا محرك نماذج JSON عام، ولا reset مفاجئ بسبب background refetch.

## 12. صفحات وسلوك الموقع

| المنطقة    | النطاق                                                                |
| ---------- | --------------------------------------------------------------------- |
| الرئيسية   | نموذج بحث ومحتوى أساسي                                                |
| الرحلات    | نتائج/تاريخ/محطات وتفاصيل وتوافر حديث                                 |
| المقاعد    | تخطيط الحافلة، اختيار مقاعد، بيانات ركاب، ملخص                        |
| المصادقة   | login/register/verify/resend/forgot/reset/logout/logout-all           |
| حجوزاتي    | قائمة وpagination وتفاصيل وحالة الدفع                                 |
| الدفع      | بدء checkout والعودة والانتظار والنجاح والفشل والانتهاء               |
| التذكرة    | QR والعرض والطباعة للتذاكر المؤكدة                                    |
| حسابي      | بيانات المستخدم وإجراءات الجلسة                                       |
| المدفوعات  | ما يتيحه Backend الحالي؛ قائمة مستقلة تحتاج endpoint تُحدد كعمل منفصل |
| حالات عامة | loading/empty/error/not-found/forbidden وإعادة المحاولة المناسبة      |

لا إلغاء حجز من الراكب. تأكيد الدفع من Backend وليس query string. لا إظهار حالة pending قديمة فوق نتيجة مؤكدة، ولا استجابة polling قديمة تستبدل نتيجة أحدث. GET متابعة الحالة لا يجري reconciliation مع Paymob؛ inquiry الصريح منفصل.

## 13. مراحل التنفيذ ومعيار الانتهاء

| المرحلة | العمل                                   | معيار الانتهاء                                                                             |
| ------- | --------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1       | api/session/apiResult وActions/TanStack | تتبع قراءة وكتابة وتجديد واضح؛ حذف wrappers وخيار auth بعد تحديث المراجع؛ كل HTTP no-store |
| 2       | shadcn/Tailwind/layout                  | ثيم ومكوّنات مستخدمة فعليًا، Header/Footer يعملان بالعربية والإنجليزية والجوال             |
| 3       | forms/auth                              | النماذج موحدة، أخطاء واضحة، حماية returnTo، بلا tokens في الواجهة                          |
| 4       | search/trips                            | البحث والفلاتر وpagination وتفاصيل الرحلة وحالات الفراغ/الفشل تعمل                         |
| 5       | seats/passengers/booking                | تخطيط ثابت، الحفاظ على المدخلات، معالجة تعارض المقعد، إنشاء حجز مرة واحدة                  |
| 6       | payments                                | نتيجة صحيحة، polling يتوقف، لا إعادة دفع غير مقصودة أو بيانات قديمة                        |
| 7       | account/history/tickets                 | المسار من الحساب والحجز إلى التذكرة والطباعة يعمل                                          |
| 8       | cleanup/UX                              | حذف غير المستخدم، globals.css محدود، مراجعة RTL والجوال والوصول وحالات التعطل              |
| بعدها   | Dashboard                               | خطة منفصلة ومشاركة ما ثبت احتياجه فقط                                                      |

النقل تدريجي. لا حذف التطبيق وإعادة كتابته دفعة واحدة. لا نغير Backend أو بيانات المستخدم لتسهيل تجربة الواجهة.

## 14. التحقق وGit

- TypeScript وESLint والبناء المناسب وتجربة المتصفح للميزات المتأثرة.
- تحقق من الزائر والمستخدم و401/403 وانقطاع الشبكة وتجديد الجلسة وتغير الحساب.
- تحقق من عدم كشف tokens في ملفات العميل أو HTML أو RSC أو Action result أو logs.
- تحقق من عدم إعادة mutations غير المؤكدة وثبات Idempotency-Key في محاولة الدفع.
- يمكن تشغيل فحوص مؤقتة بـBackend وهمي؛ لا إضافة ملفات اختبارات آلية محفوظة حسب طلب المستخدم.
- لا دفع حقيقي أو حذف بيانات أو DB backups ضمن إعادة التنظيم.
- الحفاظ على .env/.env.local و.next وdist خارج Git.
- commit لكل Feature أو مجموعة مترابطة؛ لا إعادة كتابة التاريخ المنشور.
- شرح بالعربية بعد المرحلة: ما تغير ولماذا وكيف تحققنا منه وما بقي.
- لا push دون موافقة صريحة من المستخدم.

## 15. ما أُلغي وما بقي مفتوحًا

ملغى: Feature api wrappers، وخيار auth، وNext Data Cache للكتالوج، وgateway عام للقراءات، وapiMutation كواجهة ثانية إلزامية.

محفوظ: GET الدفع فقط للمتابعة، وHttpOnly، وrefresh على السيرفر، وBackend للصلاحيات، وstrict rotation، وعدم تكرار الدفع غير المؤكد.

المتبقي قبل النشر: تنسيق refresh عبر عدة runtimes/replicas والطلبات المتأخرة، وتحقق بيئة النشر. هذه ليست قرارات محلولة ضمن الخطة.

تفاصيل تحدد خلال المرحلة المناسبة دون تعقيد مسبق: مكوّنات shadcn المطلوبة فعليًا، مدد staleTime لكل شاشة، وحاجة سجل مدفوعات مستقل إلى Backend إضافي. أي تغيير في قواعد الأعمال أو نموذج الجلسة يُناقش قبل تنفيذه.

### سجل تطبيق الخطة — الدفعة الأولى

- توحيد HTTP إلى Express في shared/lib/api.ts، وإدارة Cookies واستخراج التوكنات في session.ts، وApiResult/invokeAction في apiResult.ts. حذف apiClient/apiFetch/authCookies القديمة وFeature API wrappers.
- Actions وHooks للقراءات التفاعلية: المستخدم الحالي والكتالوج والبحث وتفاصيل الرحلة والمقاعد وسجل الحجوزات والتذكرة، بالإضافة إلى Actions الكتابة الموجودة. مفاتيح auth والحجوزات قرب ميزاتها؛ لا مفاتيح ميزات داخل queryClient.ts.
- SSR يهيئ بيانات البداية؛ ملفات lib/*.server.ts داخلية لهذا الغرض. كل fetch يستخدم no-store؛ كاش الواجهة في TanStack فقط. المقاعد تتحدث بدون router.refresh أو فقد اختيارات المقاعد وأسماء الركاب.
- متابعة الدفع عبر GET ثابت محفوظة، وكذلك منع إعادة الكتابة والدفع غير المؤكد وIdempotency-Key وحماية ترتيب ردود الدفع. التذكرة المرسلة للعميل تتضمن صورة QR فقط دون حقل payload منفصل.
- لا تغيير في Backend أو قاعدة البيانات أو Paymob. لا تغييرات UI شاملة أو إعداد shadcn/RHF المشترك بعد؛ هذه تبدأ في الدفعة التالية.
- التحقق: نجحت TypeScript وESLint وبناء الإنتاج و17 حالة معزولة للجلسة والـActions ومنع إعادة الكتابة، وتجربة متصفح للإصدار المبني مع Backend وهمي: بحث واختيار مقعد وlogin/returnTo وحفظ اسم الراكب عند تحديث المقاعد وإنشاء حجز وهمي وعرض الحجز والتذكرة والسجل بالعربية والإنجليزية والخروج. لا أخطاء متصفح، ولا عمليات على DB أو Paymob أو ملفات اختبارات داخل المشروع. يبقى تنسيق refresh بين runtimes والطلبات المتأخرة قرار نشر مستقل. لا push دون موافقة.

### سجل تطبيق الخطة — الدفعة الثانية

- إعداد shadcn/UI بنمط New York وRadix، ومسارات components.json إلى shared/components/ui ودالة cn محلية واحدة. أضيفت فقط Button/Input/Field/NativeSelect/Alert/Skeleton وتبعياتها اللازمة، مع theme من ألوان الموقع الحالية.
- Form مشتركة تهيئ useForm وzodResolver وFormProvider مرة واحدة، تدعم أنواع Zod input/output، وتعرض خطأ الإرسال العام. FormInput وFormSelect typed، وتربطان label/hint/error بـid وaria؛ SubmitButton تقرأ isSubmitting وتنتظر mutateAsync. لم نضف FormCheckbox لأن التدفقات الحالية لا تحتاج Checkbox؛ تضاف عند استخدامها.
- فصل LoginForm/RegisterForm/VerifyEmailForm، وتوحيد استعادة كلمة المرور والبحث وبيانات الركاب على المكوّنات المشتركة. تبديل خطوات Auth يتوقف أثناء mutation؛ مهلة إعادة الرمز ورسالة عدم تطابق كلمة المرور محفوظتان.
- نقل SiteHeader/SiteFooter/LanguageSwitcher إلى shared/components/layout، وReadError/RefreshPage إلى feedback، وAccountMenu إلى auth. Layout المشتركة تستقبل AccountMenu كـprop بدل استيراد تفاصيل Auth. إضافة loading/error/not-found مترجمة.
- تحويل layout والنماذج المنقولة إلى Tailwind داخل JSX، وإزالة 58 قاعدة CSS متقادمة. بقية CSS الخاصة بصفحات الرحلات والمقاعد والحجز والحساب والتذكرة تنتقل على دفعات لاحقة، لذلك لم يكتمل شرط globals.css النهائي بعد.
- إبقاء نموذج الركاب mounted عند تعديل الاختيار، مع إزالة حقول المقاعد المحذوفة فقط؛ يحتفظ كل مقعد باقٍ بالاسم المدخل خلال الإضافة والإزالة وتحديث التوافر.
- استُخدم @hookform/resolvers 5.9.2 المتوافق مع RHF7 وZod4؛ تثبيت الإصدار 6 واجه تعارض peer dependencies، ولم نستخدم force أو legacy-peer-deps.
- التحقق: نجحت ESLint وبناء الإنتاج مع TypeScript. تجربة نسخة الإنتاج مع Backend وهمي غطّت أخطاء الحقول والتركيز، التسجيل والتحقق والمهلة، طلب الاستعادة وتأكيد عدم تطابق كلمة المرور ثم النجاح، login/returnTo، إرسال تاريخ البحث الصحيح، حفظ أسماء الركاب عند تحديث المقاعد وإضافة مقعد وإزالة آخر، وإنشاء حجز وهمي. عرض الجوال 390px بلا تمرير أفقي؛ لا أخطاء متصفح. لم نغيّر DB أو Paymob أو نضف ملفات اختبارات للمشروع.

**التقدم بعد الدفعة الثانية:** طبقة API/Actions/TanStack وأساس shadcn/layout والنماذج المشتركة مطبقة؛ اكتمل نقل واجهة الرحلات في الدفعة الثالثة أدناه.

### سجل تطبيق الخطة — الدفعة الثالثة: البحث والرحلات

- تحويل الرئيسية ونتائج الرحلات وبطاقة الرحلة وتفاصيلها إلى Tailwind داخل JSX. الإبقاء على الخط والألوان الحالية، مع قراءة أوضح للمواعيد والمحطات والسعر على الجوال وسطح المكتب، واستخدام Button من shadcn للروابط والإجراءات.
- مكوّن QueryError مشترك يعرض رسالة الميزة وزر إعادة المحاولة وحالة الطلب، ومكوّن EmptyState لحالات الفراغ أو تعذر القراءة. حالات فشل SSR تعرض زر RefreshPage فعليًا يعيد القراءة؛ لا يعتمد التعافي على رابط لنفس العنوان فقط.
- عرض Skeleton عند التحميل الأول للكتالوج، وإخفاء قسم الوجهات إذا لم توجد وجهات قابلة للعرض. إظهار فشل تحديث الكتالوج حتى مع وجود بيانات سابقة، وعدم عرض «لا توجد رحلات» بالتزامن مع فشل قراءة النتائج.
- الحفاظ على البحث بالمدينة أو المحطة وتاريخ القاهرة والتنقل بين الأيام وpagination (20 رحلة، والصف 21 لتحديد وجود صفحة تالية) وروابط تفاصيل الرحلة ومخطط المقاعد الفعلي. JourneyStop مكوّن محلي صغير لتوحيد عرض وقت ومحطة المغادرة والوصول.
- حذف 124 قاعدة CSS بعد إزالة آخر مستخدميها. نقل قواعد الأساس إلى @layer base وتحديد لون الحدود من الثيم، حتى لا تلغي قواعد p/button الأساسية Tailwind utilities. CSS الخاص بالمقاعد والحجوزات والدفع والحساب والتذكرة ما زال ينتقل في الدفعات التالية.
- التحقق: ESLint وبناء الإنتاج مع TypeScript، وتجربة متصفح ببيانات وهمية للبحث بالعربية وتغيير اللغة مع حفظ البحث وتغيير اليوم واختيار مقعد ورابط العودة بالمحطات الصحيحة وpagination (20 ثم رحلتان) وحالة الفراغ ورابط اليوم التالي وفشل القراءة والتعافي بزر المحاولة، وفشل كتالوج الرئيسية والتعافي. التحقق من عرض 390px وسطح المكتب وعدم وجود تجاوز أفقي أو أخطاء متصفح. لا عمليات على DB أو Paymob ولا ملفات اختبارات محفوظة.

**التقدم بعد الدفعة الثالثة:** واجهة البحث والرحلات منقولة؛ اكتمل نقل بقية تنسيقات الشاشات في الدفعة الرابعة أدناه.

### سجل تطبيق الخطة — الدفعة الرابعة: إزالة كلاسات CSS الخاصة بالمكوّنات

- بناءً على طلب المستخدم، نُقلت جميع تنسيقات المقاعد وملخص الاختيار والحجز وحالات الدفع والحساب وسجل الحجوزات والتذكرة وحالات Auth والخطأ إلى Tailwind داخل JSX. لم نؤجل بقية الشاشات لدفعات منفصلة.
- globals.css يتضمن الآن استيراد Tailwind وتعريف الثيم والألوان وقواعد الأساس وprefers-reduced-motion فقط؛ لا class selectors خاصة بالمكوّنات ولا @apply أو ملف CSS بديل. وضعت تنسيقات العناوين والنصوص على عناصرها مباشرة.
- استعمال Button المشترك للأزرار وروابط الإجراءات عبر asChild، وإضافة size=lg للمقاس الكبير المتكرر. الحالة الشرطية تستخدم cn وكلاسات Tailwind مكتوبة كاملة.
- مخطط المقاعد يبقى LTR فعليًا في اللغتين مع السائقين والباب الأمامي والحمّام والباب الأوسط. حساب gridRow/gridColumn من رقم المقعد يظل داخل style لأنه بيانات موضع متغيرة. حالات المتاح والمختار وغير المتاح داخل JSX، مع الحفاظ على aria والاختيار وأسماء الركاب.
- التحقق: نجح ESLint وTypeScript وبناء الإنتاج. تدقيق جميع ملفات TSX وCSS وجد صفر مراجع لأسماء الكلاسات القديمة وصفر class selectors داخل CSS. تجربة إنتاج بBackend وهمي شملت مخطط 44 مقعدًا ومواضع 17–21 والمقعد المعطل، اختيار المقاعد وlogin/returnTo وحفظ الأسماء بعد تحديث المقاعد، إنشاء حجز وهمي وعرض التأكيد والتذكرة وQR بالعربية والإنجليزية، الحساب والتأكيد والتراجع عن إنهاء الجلسات وسجل الحجوزات وشاشة انتظار الدفع. عرض الجوال 390px وسطح المكتب بلا تجاوز أفقي في الشاشات المفحوصة، وبلا أخطاء متصفح. لا بيانات حقيقية أو Paymob أو ملفات اختبارات محفوظة.

**التقدم الحالي:** طلب نقل تنسيقات المكوّنات كلها إلى JSX مكتمل. تبقى مراجعة UX الشاملة وأي تحسينات وظيفية منفصلة. تنسيق refresh عبر runtimes والطلبات المتأخرة يظل قرار نشر مستقلًا. لا push دون موافقة.

### تحديث قرار Auth/API — 2026-10-21

- أكد المستخدم استمرار النمط الموحد TanStack Hook → Server Action → apiFetch لكل قراءات وكتابات الميزات التفاعلية، مع SSR لبيانات البداية واستثناء GET لمتابعة الدفع. بند منع Actions للقراءات في ملف Auth and API Refactor Spec القديم مُتجاوز بهذا القرار.
- authMiddleware يطلب GET auth/me من Backend للحصول على الجلسة والدور الحاليين، ثم يطبق roleRoutes. لم يعد يتحقق من JWT محليًا. Backend يظل مسؤولًا عن توقيع JWT وصلاحيته والجلسة النشطة والدور من قاعدة البيانات وملكية العمليات.
- أزيلت تبعية jose المباشرة من الويب وحاجة AUTH_ACCESS_SECRET في .env.example وملف الويب المحلي فقط؛ مفتاح Backend ونموذج Session/RefreshToken والتدوير الصارم لم يتغيروا.
- يستخدم Middleware apiFetch نفسه لتجديد واحد وGET واحد معاد عند 401. Cookies المجددة تصل إلى render الجاري والرد؛ 401 المؤكد يعيد login مع returnTo، والدور غير المسموح يعيد forbidden. فشل الخدمة يعطي 503 ويحافظ على Cookies، بما فيها التوكنات الجديدة إذا نجح التدوير قبل فشل GET التالي.
- يوجد طلب Backend للتحقق لكل طلب يمر عبر Middleware ومعه Cookies جلسة. يبقى تحقق SSR وActions والـBackend مستقلًا؛ لا نمرر هوية موثوقة في Headers قابلة للتزوير ولا نخزن الدور بين المستخدمين. الصفحات العامة بلا جلسة لا تستدعي auth/me من Middleware.
- التحقق: نجح ESLint وبناء الإنتاج مع TypeScript دون مفتاح JWT في الويب؛ 17 حالة معزولة تستخدم NextRequest/NextResponse الفعليين وfetch وهميًا، تشمل الدور الحالي والترقية والخفض والضوابط الخاصة والتوكن المنتهي وإلغاء الجلسة والتعطل وتزامن ستة طلبات والتدوير الناجح متبوعًا بفشل القراءة. نجحت 7 حالات HTTP فعلية على نسخة الإنتاج مع Backend وهمي: المنع، والترقية رغم claim USER القديم، وSSR دون سر توقيع في الويب، وCookies التجديد لنفس العرض، والخفض، والتعطل، والإلغاء. لا اختبارات محفوظة بالمشروع ولا DB أو Paymob أو تغييرات Backend. يظل تنسيق refresh عبر runtimes والطلبات المتأخرة قرار نشر مستقلًا. لا push دون موافقة.

### تدقيق إغلاق متطلبات Auth/API — 2026-10-21

المرجع هو Auth and API Refactor Spec مع قرارَي المستخدم الأحدث: TanStack + Server Actions للقراءات والكتابات التفاعلية، والدور الحالي من Backend داخل Middleware. تغييرات كل مرحلة لا تعني أن بقية البنود لم تكن موجودة؛ الجدول التالي يميز الحالة الكاملة.

| البند                                        | الحالة الحالية                                                                                                                |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Session + Access JWT + rotating RefreshToken | محفوظ؛ لا تغيير في نموذج Backend أو مدة التوكنات                                                                              |
| قراءات وكتابات الواجهة                       | مطبق: TanStack Hook → Feature Server Action → apiFetch؛ SSR لبيانات البداية                                                   |
| منع read Actions في الملف القديم             | مستبدل صراحة بقرار المستخدم؛ لا يُنفذ                                                                                         |
| apiFetch server-only مركزي                   | مطبق؛ لا Feature API wrappers أو HTTP gateway عام                                                                             |
| HttpOnly access/refresh cookies              | مطبق؛ أسرار الجلسة لا تدخل Action result أو TanStack أو Zustand                                                               |
| Refresh على السيرفر فقط                      | مطبق في Middleware وapiFetch، دون browser refresh flow                                                                        |
| دمج Refresh المتزامن                         | مطبق داخل runtime واحد؛ Map يحذف الطلب عند الاستقرار                                                                          |
| حماية الأدوار                                | مطبق: Middleware يقرأ auth/me من Backend ثم يطبق roleRoutes                                                                   |
| local JWT verification في proxy              | مستبدل صراحة بقرار المستخدم؛ لا يحتاج الويب مفتاح التوقيع                                                                     |
| تمرير Cookies المجددة لنفس render            | مطبق، مع حفظها في redirects وحتى 503 إذا نجح التدوير قبل فشل القراءة                                                          |
| صلاحيات Backend وActions الخاصة              | محفوظة؛ المصادقة والملكية داخل عمليات Backend، مع preflight للكتابات وقراءة الملكية قبل checkout/inquiry                      |
| الرد success/code/message/data/requestId     | مطبق في Backend، وتعرض الواجهة message وتفرع القرارات على code                                                                |
| ترجمة Accept-Language وvalidation عامة       | مطبق؛ 84 literal codes مدققة بلا ترجمات مفقودة؛ Auth وBookings يستخدمان validationError المشتركة                              |
| requestId في الأخطاء غير المتوقعة فقط        | مطبق للأخطاء 5xx غير المتوقعة؛ لا تفاصيل استثناء أو مصفوفة أخطاء في الرد                                                      |
| متابعة الدفع                                 | Route Handler GET واحد، محمي وowner-scoped؛ لا polling عبر Actions أو مصالحة Paymob داخل GET                                  |
| عدم تكرار الكتابة/الدفع مجهول النتيجة        | مطبق؛ mutations بلا retry وIdempotency-Key محفوظ                                                                              |
| إزالة القديم والمهاجرة التدريجية             | apiClient/apiFetch/authCookies القديمة والـGateway وFeature api wrappers محذوفة؛ توثيق تاريخ المراحل محفوظ وموسوم كحالة سابقة |

**التنظيف في هذه الدفعة:** أزيل تكرار إنشاء خطأ VALIDATION_ERROR في auth.actions وbookings.actions لصالح shared/lib/apiResult.validationError؛ لم نضف طبقة أو عميل HTTP جديدًا.

**التحقق الإضافي:** تدقيق المصدر وجد 84 code حرفيًا معرفة في قاموس الرسائل وصفر JSON responses مباشرة في Controllers. نجحت 16 حالة HTTP مع Express معزول تغطي نجاح/إنشاء/validation/JSON تالف/جسم كبير/404/500/503 المتوقعة بالعربية والإنجليزية، وصحة X-Request-ID وعدم كشف الاستثناءات. نجحت 17 حالة API/Actions معزولة بعد التنظيف تشمل HttpOnly/redaction والتجديد والتزامن والتحقق قبل mutation وعدم إعادة الكتابة مجهولة النتيجة وملكية التذكرة. TypeScript وESLint وبناء الإنتاج ضمن فحص الدفعة. لا DB/Paymob أو اختبارات آلية محفوظة بالمشروع.

**المفتوح قبل تشغيل عدة نسخ من السيرفر:** تنسيق تجديد الجلسة بين runtimes/replicas والطلبات المتأخرة التي تحمل Refresh قديمًا. Map الذاكرة الحالية لا تحل هذا السيناريو؛ نموذج التدوير الصارم وفشل إعادة استخدام التوكن محفوظان. لا grace window أو تخزين/تنسيق مشترك مضاف دون قرار مستقل. اختيارات JSON refresh opt-in أو تغيير خوارزمية JWT في الملف القديم اختيارية وليست تعديلات لازمة لهذه الدفعة.

**التالي:** قرار تنسيق Refresh إذا بدأ تجهيز نشر متعدد النسخ؛ وإلا متابعة الميزات/مراجعة UX وفق خطة الموقع. لا نعيد بناء الأجزاء المنفذة أو نستبدل قرارات المستخدم الأحدث. لا push دون موافقة.

### تصحيح فصل مسؤولية Refresh — 2026-10-21

- المراجعات السابقة تحققت من سلوك مساعد التجديد المشترك، لكنها أبقته داخل api.ts. لم يكن الفصل الذي طلبه المستخدم الآن منفذًا، ولا يُعد تدقيق سلوك الجلسة دليلًا على فصل الملفات.
- أضيف refreshSession.ts ونُقلت إليه عملية auth/refresh والتحقق من التوكن واستخراج الزوج الجديد وMap الطلبات المتزامنة. تبقى شروط استدعائه وحفظ Cookies وإعادة قراءة GET واحدة عند 401 داخل apiFetch؛ هذه إدارة الطلب الأصلي.
- دالة requestBackend الداخلية في api.ts هي موقع fetch الوحيد نحو Express، مع نفس headers/timeout/no-store وقراءة الرد. تُمرر للمساعد دون تصدير عميل HTTP جديد للميزات أو اعتماد دائري. نُقل fallback النتيجة المحلي إلى apiResult.apiFailure حتى لا يتكرر بين الملفين.
- لم يتغير نموذج التوكنات أو Cookie policy أو Backend أو retry للكتابات. TanStack + Server Actions والدور من Backend هما القراران الأحدث بدل بندَي Server-Component-only reads وJWT role verification المحليين في الملف المرفق.
- التحقق لهذه الدفعة: TypeScript وESLint وبناء الإنتاج، و17 حالة API/Actions و17 حالة Middleware معزولة بعد الفصل، بما فيها six-way single-flight وHttpOnly/redaction والتجديد لنفس render و503 بعد تدوير ناجح وعدم إعادة الكتابة مجهولة النتيجة. لا اختبارات محفوظة بالمشروع أو DB/Paymob.

**حد الاكتمال:** فصل Refresh ومهام التطوير الحالية مطبق. التنفيذ ليس مطابقًا حرفيًا لكل سطر في الملف القديم: بندا القراءة والدور مستبدلان باختيارات المستخدم، وتنسيق refresh بين عدة runtimes/replicas والطلبات المتأخرة ما زال قرار نشر مفتوحًا. لا grace window أو تغيير JWT algorithm أو JSON-token opt-in أضيف ضمنيًا.

### استكمال مساعد تحليل Zod — 2026-10-21

- كان الموجود validationError لتوحيد رسالة الفشل فقط، بينما استدعاءات safeParse ومعالجة فشل المدخلات موزعة في Actions. هذا لم يحقق طلب المستخدم بوجود مساعد parsing موحّد.
- أضيف shared/lib/parseSchema.ts بمخرجات discriminated union typed، مع safeParseAsync ورسالة عامة مترجمة واحدة ودون issues أو صدى للمدخلات.
- نُقلت جميع عمليات تحليل المدخلات في وحدات auth/bookings/trips/seats/tickets Actions إلى المساعد؛ حُذف invalidInput المحلي وتكرار getLocale لأخطاء المدخلات. schemas وقواعد الميزات في ملفاتها، والطلبات تستخدم البيانات المعالجة مع الحفاظ على trim/normalization وIdempotency-Key.
- التحقق: TypeScript وESLint وبناء الإنتاج، و10 حالات معزولة للمساعد والتحويلات وdefaults وasync refinement والترجمة وعدم كشف المدخلات والـstrict input وحدود offset وتمرير مفتاح الدفع الموحّد وlogout {}. نجحت أيضًا 17 حالة API/Actions للجلسة والتجديد وعدم تكرار الكتابة. لا اختبارات محفوظة بالمشروع ولا خدمات Backend/DB/Paymob حقيقية مستخدمة.
- هذا الاستكمال يخص parsing مدخلات Server Actions. اختيار TanStack والتحقق من الدور عبر Backend محفوظان، وتنظيم Refresh في ملف مستقل محفوظ. تنسيق Refresh بين runtimes والطلبات المتأخرة يظل مفتوحًا قبل النشر متعدد النسخ. لا push دون موافقة.

### Local auth reliability fixes (2026-10-21)

This update supersedes earlier strict-immediate-replay and deployment-pending refresh notes. PostgreSQL's existing Session row lock coordinates all API replicas. Each successful rotation derives one immediate successor using a domain-separated HMAC under the API signing key; only token hashes are stored. All replicas must share the same signing key, as already required for JWT validation. No database migration or plaintext token storage is needed.

A used refresh token may recover that exact successor for at most 30 seconds after its original usedAt, only while the successor is still unused and unexpired and the user/session remain active. Recovery does not create another RefreshToken, extend usedAt, or extend the session expiry. Outside the window, or after the successor has itself rotated, reuse revokes the session. This deliberately trades immediate replay detection for a bounded concurrency overlap: a stolen bearer token can also be reused during those 30 seconds. It does not solve arbitrarily delayed requests. Old rotations created before this update have no recoverable derived successor and still fail closed. The web Map remains an optimization, not the cross-replica guarantee.

useAuth now recognizes TanStack query errors as unavailable and retries the session query before refreshing server content. Backend requests combine the caller's AbortSignal with their independent 20-second deadline; protected writes still execute once and uncertain writes are not replayed.

Passenger booking/checkout/status/ticket limits now use the authenticated user id. Public auth/session/recovery limits can distinguish clients behind Next using a signed IP context bound to timestamp, HTTP method and exact request URL. Configure an independent 32-byte hexadecimal API_CLIENT_CONTEXT_SECRET on API and Next, and TRUSTED_CLIENT_IP_HEADER (for example x-real-ip) on Next. The ingress must overwrite that header with one validated client IP and prevent direct Next-origin access; never trust arbitrary browser X-Forwarded-For. Missing or invalid signatures fall back to the API's normal trusted-network IP and do not grant a separate quota. With the feature disabled, anonymous callers behind Next still share its network quota. Production ingress settings cannot be inferred from local code and require explicit deployment configuration. No real secrets are added to example files.

Rate-limit counters remain process-local. Multi-API deployments must use a shared limiter store or a trusted ingress enforcing the intended aggregate limits; signed client identity fixes attribution, not distributed counter storage. Keep direct API exposure restricted. No provider/payment behavior is changed.

### توحيد التحقق في متابعة الدفع — 2026-10-21

- يستخدم GET /api/payments/[bookingId]/status الآن parseSchema نفسه المستخدم في Server Actions؛ قواعد bookingId ورفض query parameters داخل paymentStatusInputSchema في ميزة الحجوزات.
- يقبل parseSchema لغة اختيارية لمسارات Route Handlers التي تعمل خارج [locale]. عند عدم تمريرها، يقرأ لغة الصفحة كما كان في Actions. لا يُقرأ getLocale عند نجاح التحقق أو عند تمرير اللغة صراحة؛ ورسالة الخطأ العامة تدعم ar وar-EG وen دون كشف المدخلات أو Zod issues.
- الحفاظ على CSRF وملكية الحجز وHttpOnly وتجديد الجلسة، وCache-Control الخاص، وحذف checkoutUrl من قراءة الحالة. لا تغيير في دورة الدفع أو استدعاءات Paymob أو إعادة محاولة mutations؛ status يبقى HTTP status ولا يُضاف إلى JSON.
- التحقق: نجح TypeScript وESLint وبناء Next.js. نجحت 17 حالة مؤقتة للمساعد وRoute Handler باستخدام NextRequest/NextResponse الفعليين، و10 حالات regression لتحويلات Zod وActions. لا اختبارات محفوظة داخل المشروع ولا اتصالات بقاعدة البيانات أو Paymob.
- الدفعة تخص توحيد التحقق فقط؛ تعديلات الواجهة الأخرى الموجودة مسبقًا خارج نطاقها. لا push دون موافقة.

### مراجعة وتبسيط هيكل الويب — 2026-10-21

- دُققت جميع ملفات TS/TSX الحالية ومراجعها. كانت صفحات app الخمس عشرة Server Components بالفعل؛ المشكلة كانت اتساع حدود بعض مكوّنات Client. بقيت الصفحات على السيرفر، مع نقل إطار تسجيل الدخول وبيانات الحساب وأجزاء الحجز الثابتة وروابط الوجهات ومقدمات/خواتيم المحطات وFAQ إلى السيرفر. يبدأ العرض ببيانات الصفحة ثم يستخدم التفاعل TanStack + Server Actions + apiFetch؛ متابعة الدفع فقط عبر GET الخاص بها.
- أسماء مفاتيح TanStack في hooks/queryKeys.ts داخل ميزاتها. أزيلت مصفوفات المفاتيح من hooks، ووُحّد retry الافتراضي بدل تكراره، ووُحدت عملية resetAuthCache عند الدخول والخروج وانتهاء الجلسة دون إبقاء بيانات الحساب السابق.
- حُذفت الملفات الوسيطة أحادية الاستخدام AuthSessionSync وLoginScreen وRequireAuth وAccountProfile وPaymentResult وtickets.server بعد نقل المسؤوليات إلى Provider أو الصفحة أو تدفق اختيار المقاعد. دُمج useTripSeats داخل useSeatBooking، وقُسّم HomeContent إلى بحث تفاعلي وروابط وجهات على السيرفر، وأعيدت تسمية auth.queries/bookings.queries إلى queryKeys. لا وظائف حجز/تذكرة/جلسة محذوفة.
- auth.server.ts يحتوي فقط getCurrentUser وrequireCurrentUser. بقي safeReturnPath لأنه يتحقق من وجهة الرجوع، وبقيت session/refreshSession/parseSchema لأنها مسؤوليات فعلية مشتركة. لا حذف لـi18n/request.ts؛ يستخدمه next.config.ts عبر إعداد next-intl وإن لم يظهر في import graph العادي. أزيلت routeLabel غير المستخدمة.
- BookingDetail مكوّن Server يمرّر العرض الثابت كـchildren إلى BookingPayment. نُقل توقيت/حالة الدفع إلى useBookingPayment، ومنطق المقاعد إلى useSeatBooking؛ بقيت حماية ترتيب ردود الدفع وIdempotency-Key وعدم إعادة الكتابة مجهولة النتيجة. تعرض صفحة نتيجة الدفع عنوان h1 واحدًا. عرض مجموعات المحطات دالة محلية مسماة بدل JSX متداخل طويل دون ملف إضافي.
- shared لا يستورد تفاصيل Features؛ HeaderNavigation المعتمد على Auth داخل auth/components ويحقنه Layout في SiteHeader عبر navigation prop، مثل AccountMenu. format.ts يتعامل مع شكل بيانات عام. التنسيقات الخاصة بالمكوّنات داخل Tailwind في JSX؛ globals.css للثيم والأساس وkeyframes فقط.
- التحقق: TypeScript وESLint وبناء الإنتاج. نجحت 67 حالة مؤقتة: 17 API/Actions، و10 parsing، و17 payment-handler، و17 Middleware، و6 query/cache/returnTo. تجربة إنتاج مع Backend وهمي غطّت المحطات وFAQ، اختيار المقعد كزائر ثم login/returnTo، حفظ أسماء الركاب عند التحديث والإضافة، إنشاء حجز وهمي، الحساب وإظهار/إلغاء تأكيد الخروج من الجميع، سجل الحجوزات والتذكرة وQR، وانتقال نتيجة الدفع من processing إلى confirmed والعربية. لا بيانات مشروع أو Paymob أو ملفات اختبارات محفوظة في المستودع.
- هذا تنظيم للميزات الموجودة؛ المكوّنات التي تحتاج state أو Query hooks أو النماذج أو polling تظل Client. لا تحويل تلقائي لكل المكوّنات إلى Server، ولا تغيير Backend أو سياسة الجلسة أو خوارزمية الدفع. لا push دون طلب جديد.

فحص المتصفح النهائي: قائمة الجوال بعد حقن Navigation عبر props، ومجموعات المحطات، ونتيجة الدفع بالعربية عند عرض 390px؛ لا تجاوز أفقي ولا أخطاء JavaScript، وعنوان h1 واحد في نتيجة الدفع. أُغلقت المعاينة المؤقتة بعد التحقق.

### توحيد نمط نماذج استعادة كلمة المرور — 2026-10-21

- كانت PasswordRecovery تجمع إطار الصفحة ونموذجَي الطلب والتغيير والانتقال بين الحالات داخل Client Component واحد. أصبحت إطار Server يعرض المقدمة والثيم، مع PasswordRecoveryForm صغير لإدارة request/reset/done، وForgotPasswordForm وResetPasswordForm مستقلين على نمط LoginForm وRegisterForm. كل نموذج يستخدم Form/FormInput/SubmitButton المشتركة وmutation hook المخصص.
- قواعد التغيير داخل recoverySchema.ts مرة واحدة؛ createRecoveryResetSchema يخصص رسالة عدم التطابق فقط للواجهة، بينما recoveryResetSchema يحافظ على تحقق Server Action نفسه. لا تركيب shape داخل JSX ولا تكرار قواعد كلمة المرور في المكوّن.
- تنظيف كاش الجلسة بعد نجاح التغيير داخل useResetPassword.onSuccess، مثل مسؤولية Hooks الدخول والخروج؛ أزيل clearSession غير المستخدم من useAuth ولم يعد النموذج يشترك في قراءة المستخدم الحالي لهذا الغرض. الفشل لا ينظف الكاش، والنتيجة مجهولة المصير لا تعاد تلقائيًا ولا تعلن نجاحًا.
- حفظ البريد المعالج بين الخطوات، وreturnTo، ومهلة إعادة الإرسال 60 ثانية، ومسح الرمز السابق وتركيز الحقل عند طلب رمز جديد. يُزال خطأ البريد القديم بعد تصحيحه. لا تغيير endpoint أو Backend أو قواعد الاستعادة.
- التحقق: ESLint وبناء الإنتاج مع TypeScript، و8 حالات معزولة للـSchema والنماذج وTanStack MutationObserver، بالإضافة إلى 10 parsing و6 query/cache regressions. تجربة المتصفح مع Backend وهمي غطت الطلب والانتقال، رفض البريد الفارغ ثم تصحيحه وإعادة الإرسال ومسح الرمز والمهلة وحفظ returnTo؛ لا أخطاء JavaScript، ولا حساب/بريد/قاعدة بيانات أو تغيير كلمة مرور حقيقي، ولا اختبارات محفوظة في المستودع.

### تنظيم مكوّنات المصادقة — 2026-10-21

- جُمعت مكوّنات الدخول والتسجيل وتأكيد البريد في components/forms، والاستعادة في components/password-recovery، والقوائم في components/navigation.
- أُعيدت تسمية AuthForm إلى AuthFlow وPasswordRecoveryForm إلى PasswordRecoveryFlow لأنهما يديران الانتقال بين النماذج. فُصل ResetPasswordActions في ملف مسمى داخل مجلد الاستعادة؛ يستخدم useFormContext لنفس النموذج وتبقى الحقول مباشرة داخل Form.
- حُدثت الاستيرادات دون ملفات إعادة تصدير أو تغيير في API أو سلوك المصادقة.

### تقليل ملفات استعادة كلمة المرور — 2026-10-21

- أصبح مجلد password-recovery يحتوي ثلاثة ملفات فقط: PasswordRecovery لإطار Server، وPasswordRecoveryFlow لطلب الرمز والانتقال request/reset/done، وResetPasswordForm لتغيير كلمة المرور.
- دُمج ForgotPasswordForm داخل PasswordRecoveryFlow، وأصبحت ResetPasswordActions دالة مكوّن محلية داخل ResetPasswordForm بدل ملف مستقل؛ تبقى حقول Form مباشرة وأدوات النماذج وHooks وSchemas المشتركة كما هي.
- حفظ البريد بين الخطوات دون إضافته للرابط، وreturnTo، ومسار إدخال رمز موجود، ومهلة إعادة الإرسال ومسح الرمز القديم والتركيز، ورسائل الفشل والنتيجة غير المؤكدة. لا تغيير في Backend أو سياسة الجلسة.

### إزالة Zustand وتثبيت مسؤوليات الحالة — 2026-10-21

- قرار المالك الحالي يحل محل الملاحظات التاريخية عن Zustand: أزيلت الحزمة من apps/web/package.json وpackage-lock.json، وحُذف seats/store/bookingStore.ts. أُلغي تعديل متجر المستخدم المعلّق قبل حفظه في Git؛ لا AuthStoreContext أو متجر مستخدم ثانٍ.
- بيانات المستخدم في TanStack تحت authKeys.me. useAuth يشارك القراءة والكاش، وتُحدّث البيانات عبر setQueryData عند الدخول أو رد تحديث حساب لاحق. resetAuthCache يلغي الطلبات ويزيل بيانات الحساب السابق عند الخروج أو انتهاء الجلسة أو تغيير كلمة المرور. SSR يهيّئ كاش المستخدم الآمن عبر QueryClient خاص بالطلب وHydrationBoundary؛ التوكنات في HttpOnly فقط.
- AccountProfile يقرأ نفس useAuth، فتتحدث بطاقة الحساب مع الكاش دون قراءة مستخدم مستقلة في صفحة الحساب. لا إضافة endpoint أو نموذج لتعديل الملف الشخصي في هذه الدفعة.
- selectedIds وtoggle/reset داخل useSeatBooking باستخدام useState وتحديث وظيفي. يُستعاد فقط المقعد الموجود والمتاح من returnTo، وتبقى حالة النموذج وأسماء الركاب عند تغيير الاختيار؛ فشل الحجز لا يمسح الاختيارات، ونجاحه يمسحها. Backend يظل مسؤولًا عن التوافر والحجز الفعلي.
- التوزيع المعتمد: TanStack لبيانات API والمستخدم، وRHF للنماذج، وuseState للحالة المحلية، وURL للبحث والفلاتر ورقم الصفحة. لا تعديل في Backend أو Refresh أو تدفق الدفع، ولا تغيير في اتفاق Server Actions خلال هذه الدفعة.
- التحقق: نجحت فحوص ESLint وTypeScript وبناء الإنتاج و6 فحوص معزولة للكاش. غطت معاينة بواجهة خلفية وهمية اختيار المقاعد وحفظ اسم الراكب وتسجيل الدخول والعودة للحجز وصفحة الحساب وإعادة تحميلها والخروج، دون أخطاء JavaScript أو اتصال بقاعدة البيانات أو Paymob؛ لم تضاف ملفات اختبارات للمستودع.

### تبسيط API/Auth — 2026-10-22

- نُفذت خطة تقليل الطبقات: HTTP في api.ts، وإدارة الجلسة في auth.server.ts، ونتائج العمليات في Actions. حُذف session.ts وrefreshSession.ts وتصنيف endpoints داخل النقل وخيارات context/onSession وتمرير HTTP callback إلى refresh.
- حذف cookies يحدد Max-Age=0 وExpires في الماضي معًا؛ هذا يمنع إعادة إنشاء cookies فارغة عند نسخ Next للـproxy cookies إلى رد Server Action.
- انتهت سلسلة window event/listener؛ QueryCache وMutationCache يعالجان UNAUTHENTICATED مركزيًا. المصالحة الصريحة للدفع تستخدم useMutation، ويبقى polling GET قراءة فقط مع حماية ترتيب النتائج.
- تظل TanStack وServer Actions للقراءات التفاعلية، وlive backend role checks داخل proxy، وSSR read-only، وHttpOnly، وملكية الحجز، وidempotency، وعدم إعادة الكتابة غير المؤكدة. قواعد Express والتجديد عبر PostgreSQL لم تتغير.
- التحقق: 38 فحصًا معزولًا للسيرفر والـActions والـproxy والـRoute Handler، و8 للكاش، و15 فحصًا في Chromium على بناء الإنتاج مع API محاكي. تشمل الدخول والتسجيل والتحقق والاستعادة والخروج من جهاز/جميع الأجهزة، وعودة cookies المجددة مع next-intl، و503 بعد التجديد، والتزامن، وتغيير الحساب دون بيانات قديمة، وتجديد GET الدفع دون كشف checkout URL. لا DB أو بريد أو Paymob حقيقي ولا ملفات اختبارات جديدة في Git.
- نجح TypeScript وESLint وبناء الإنتاج داخل Node 24 Docker. فحص التنسيق العام له ملاحظات سابقة في المستودع؛ تُراجع منفصلة عن سلوك المصادقة. لا push دون موافقة صريحة.

## خطة استكمال موقع الركاب والحساب — 2026-10-22

هذه هي خطة الدفعات التالية بطلب المالك. تضيف قائمة أفاتار وصفحات حساب متناسقة، وتغلق الميزات الناقصة قبل مراجعة UX الشاملة ثم Dashboard. لا تعني هذه الخطة أن الميزات أدناه منفذة، ولا تعيد فتح قرارات Auth/API الأخيرة.

### 1. قائمة المستخدم في Header

- استبدال رابط الحساب وزر الخروج المنفصلين بـAccountMenu واحد يستخدم shadcn DropdownMenu وAvatar؛ إعادة استخدام Radix المثبت، دون مكتبة قوائم جديدة.
- الأفاتار يعرض أول حرفين من الاسم؛ لا رفع صور ولا اعتماد على خدمة صور خارجية. زر دائري لا يقل عن 44px، ومعه الاسم الأول وسهم صغير على الشاشات الواسعة.
- رأس القائمة يعرض الاسم والبريد، ثم: «حسابي» /account، «حجوزاتي» /bookings، «المدفوعات والاستردادات» /account/payments، «الأمان والجلسة» /account/security؛ يليها فاصل ثم «تسجيل الخروج».
- روابط الشروط والخصوصية تبقى في Footer وصفحات السياسات العامة؛ لا تزاحم العمليات الشخصية في القائمة. رابط الأسئلة الشائعة يبقى في التنقل العام.
- Dropdown بعرض نحو 288px وبحد أقصى عرض الشاشة ناقص 32px، ومحاذاة منطقية تتبع RTL/LTR. الاسم والبريد الطويلان لا يسببان تجاوزًا أفقيًا.
- لوحة المفاتيح: Enter/Space للفتح، الأسهم للتنقل، Escape للإغلاق وإرجاع التركيز؛ الإغلاق عند اختيار رابط أو النقر خارج القائمة. استخدام سلوك Radix الأصلي.
- useAuth يقرأ المستخدم من كاش TanStack؛ useLogout ينفذ الخروج. نعتمد mutation.isPending بدل busy مكرر؛ الفشل يعرض رسالة واضحة ولا يدعي نجاح الخروج.
- الزائر يرى «تسجيل الدخول» مع returnTo آمن يحافظ على المسار والبحث؛ حالة تعذر الجلسة تعرض إعادة المحاولة. لا وميض لقائمة مستخدم سابق أثناء التحميل أو تبديل الحساب.

### 2. تصميم منطقة الحساب

التوجه: امتداد هادئ لهوية Rihla الحالية، بخط IBM Plex Sans Arabic وخلفية فاتحة وألوان navy #112f45 وocean #006f7b؛ استخدام tokens الموجودة وTailwind داخل JSX. لا لوحات إحصائية أو رسوم أو أرقام مالية غير مدعومة بالـAPI.

- سطح المكتب من lg: إطار بعرض أقصى 1180px، تنقل جانبي بعرض نحو 240px عند بداية اتجاه القراءة، ومحتوى مرن بجواره بفاصل 24–32px. عنوان واضح ووصف قصير ومحتوى مرتب بخطوط فصل، دون بطاقة لكل معلومة.
- الجوال والتابلت: عنوان الصفحة ثم تنقل أفقي قابل للتمرير، والمحتوى بعرض كامل. قائمة الأفاتار تظل نقطة الوصول العامة. جداول المعاملات تصبح بطاقات واضحة على الجوال.
- AccountLayout مكوّن عرض Server مشترك يركب AccountNavigation والمحتوى. تستخدمه صفحات الحساب والحجوزات الحالية دون تغيير روابطها العامة أو إضافة طبقات route groups فقط لتنفيذ التصميم.
- AccountNavigation وAccountMenu يستخدمان قائمة روابط شخصية واحدة صغيرة في accountLinks.ts؛ لا registry أو مولد تنقل عام.
- حالات موحدة: Skeleton عند القراءة الأولى، رسالة فراغ مع إجراء مناسب، خطأ قابل لإعادة المحاولة، تمييز الصفحة النشطة وfocus ظاهر وتباين مناسب؛ احترام reduced motion.

```text
Header: الشعار | تنقل الموقع | اللغة | الأفاتار ▼
                                        حسابي
                                        حجوزاتي
                                        المدفوعات والاستردادات
                                        الأمان والجلسة
                                        ──────────
                                        تسجيل الخروج

AccountLayout: [التنقل الشخصي] [عنوان الصفحة + محتواها]
Mobile:        [عنوان] [تنقل أفقي] [المحتوى]
```

### 3. الصفحات والوظائف المطلوبة

كل المسارات أدناه تحت /ar أو /en.

| المسار                       | المحتوى والسلوك                                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| /account                     | عرض الاسم والبريد والهاتف، وروابط الحجوزات والمدفوعات؛ عرض فقط حسب API الحالي، دون زر تعديل وهمي.                                                                        |
| /account/security            | نقل AccountSessions الحالي: الخروج من الجهاز أو جميع الأجهزة بتأكيد، ورابط استعادة كلمة المرور الموجود؛ لا قائمة أجهزة أو تغيير كلمة مرور أثناء الدخول قبل وجود API لها. |
| /bookings                    | سجل الحجوزات الحالي مع فلاتر حقيقية: الكل، القادمة، السابقة، المنتهية، الملغاة من الشركة؛ pagination والفلتر في URL.                                                     |
| /bookings/[bookingId]        | التفاصيل والحالة والركاب وروابط الدفع/التذكرة الموجودة داخل تصميم الحساب المشترك.                                                                                        |
| /account/payments            | سجل محاولات الدفع والاستردادات: مرجع الحجز، تاريخ المحاولة، المبلغ بالجنيه، حالة الدفع والاسترداد ومبلغه المسجل، ورابط الحجز.                                            |
| /bookings/[bookingId]/ticket | العرض الموجود مع زر طباعة وتنسيق ورقة واضح يحافظ على QR والمقاعد والمواعيد ويخفي Header/Footer والتنقل عند الطباعة.                                                      |
| /terms                       | شروط الاستخدام والحجز والدفع وصلاحية الحجز المؤقت وسياسة الإلغاء والاسترداد والتواصل.                                                                                    |
| /privacy                     | البيانات التي نجمعها وأغراضها، Cookies الجلسة، مزود الدفع والبريد، مشاركة البيانات ومدة الاحتفاظ ووسيلة التواصل والطلبات المتعلقة بالبيانات.                             |

صفحة /faqs الحالية هي المساعدة؛ لا إنشاء /help يكرر محتواها. الروابط الحالية للتسجيل والتحقق داخل /login تظل صالحة؛ لا مسارات إضافية لمجرد مطابقة أسماء الخطة القديمة.

### 4. ما يحتاج Backend

**سجل المدفوعات:** إضافة GET /api/v1/account/payments محمي ومحدد بالمستخدم المصادق عليه، مع limit/offset مطابقين لنمط المشروع وحقول استجابة صريحة. كل صف يمثل PaymentAttempt حقيقيًا مرتبطًا بالحجز؛ ربط حالات الدفع والاسترداد من السجلات الموجودة دون تكرار صفوف نتيجة تعدد webhooks أو joins. ترتيب ثابت بتاريخ الإنشاء ثم id، مع فهرس عند الحاجة بعد مراجعة الاستعلام. لا raw provider payloads أو credentials أو checkout URLs أو معلومات مستخدم آخر، ولا إجماليات أو رسوم أو مواعيد تحويل بنكي مخترعة. عملية GET قراءة من قاعدة البيانات ولا تتصل بـPaymob.

**فلاتر الحجوزات:** توسيع endpoint الحجوزات الحالي بفلتر معتمد في Schema والخدمة والاستعلام، قبل pagination. تعريف المجموعات في Backend: القادمة = حجوزات نشطة وموعد مغادرتها مستقبلًا؛ السابقة = حجوزات مؤكدة وموعد مغادرتها مضى؛ المنتهية = حالة انتهاء الحجز؛ الملغاة = إلغاء الشركة. استخدام enum الفعلي للمشروع عند التنفيذ، ووقت الخادم للمقارنة، وعرض المواعيد بتوقيت القاهرة. لا تصفية 20 سجلًا محليًا والادعاء أنها كل النتائج.

التغييرات لا تتيح للراكب الإلغاء أو طلب الاسترداد. تبقى سياسة إلغاء الشركة والاسترداد الكامل وصلاحيات Super Admin كما اعتمدها المالك.

### 5. تنظيم الكود ومسؤولياته

- نعدل AccountMenu وAccountNavigation وAccountProfile وAccountSessions الموجودة. نضيف AccountLayout وaccountLinks فقط عند تنفيذ التنقل؛ لا Context أو متجر مستخدم جديد.
- ميزة سجل المدفوعات تضاف داخل account: actions/account.actions.ts، hooks/usePaymentHistory.ts، hooks/queryKeys.ts، types/payment.ts وcomponents/PaymentHistory.tsx؛ إضافة Schema للمدخلات عند الحاجة الفعلية. لا api folder وactions متوازيان ولا wrappers تعيد استدعاء دالة بنفس الوسائط فقط.
- Pages وAccountLayout Server Components: عنوان وmetadata وقراءة أولية عبر النمط الحالي ثم تمرير البيانات. Hooks تدير TanStack والفلتر/ترقيم الصفحات والتعامل مع الطلبات؛ المكوّن يعرض البيانات ويربط handlers مسماة، دون كتلة async طويلة داخل JSX.
- المنطق البسيط مثل فتح قائمة أو تبديل تبويب يبقى محليًا. نفصل hook عندما يجمع طلبات أو effects أو انتقالات متعددة، دون hook لكل زر أو ملف لكل دالة.
- api.ts هو نقل HTTP الحالي؛ auth.server.ts مسؤول الجلسة وHttpOnly وrefresh؛ Server Action يتحقق من المدخل ويستدعي الدالة المناسبة؛ TanStack يمتلك بيانات API والكاش. SSR للتهيئة وfetch no-store، دون إدخال Next Data Cache أو Zustand.
- مفاتيح السجل تتضمن userId واللغة والفلتر وoffset؛ تغيير الفلتر يعيد offset إلى صفر، والخروج/تبديل الحساب ينظف البيانات بالمسار الحالي.
- عناصر shadcn تُضاف فقط عند الاستخدام: DropdownMenu وAvatar، وTabs/Table/Badge إن احتاجها التصميم؛ Pagination الحالية والـButton والـForm وردود الأخطاء تُعاد الاستفادة منها قبل إضافة بدائل.
- صفحات السياسات Server بسيطة، مع مكوّن PolicyPage مشترك فقط إذا تكرر الإطار فعلًا؛ النص العربي والإنجليزي صريح ومراجع، دون CMS أو محرك مستندات.
- إضافة @media print محدودة للطباعة مقبولة؛ بقية تنسيق المكوّنات يبقى Tailwind داخل العناصر.

### 6. الشروط والخصوصية: المحتوى المطلوب

نجهز النصوص كمسودة قابلة للمراجعة قبل إتاحتها للجمهور. سياسة الحجز المعتمدة تُكتب بوضوح: لا إلغاء من الراكب؛ إلغاء الشركة يترتب عليه رد كامل المبلغ وفق مسار الاسترداد المعتمد. نعتمد وصف البيانات من التدفقات الفعلية ولا ندعي أن التطبيق يخزن بيانات البطاقة أو أن مزودًا معينًا لا يخزنها دون تحقق.

قبل النشر الفعلي تحتاج النصوص: اسم الجهة المشغلة، وسيلة تواصل معتمدة، سياسة الاحتفاظ الفعلية بالبيانات، وأي مدة استرداد مؤكدة من التشغيل/المزود. لا اختراع مدة أو عنوان أو وعد قانوني. نضيف تاريخ التحديث وروابط Footer ونموذج التسجيل؛ لا نفترض أن نصًا إنشائيًا يحقق جميع متطلبات القانون. إعداد الصفحات والمسودات لا يتوقف على هذه البيانات؛ اعتماد المحتوى النهائي قبل النشر فقط.

### 7. دفعات التنفيذ وGit

| الدفعة | العمل المتكامل                                                                       | معيار الانتهاء                                                                                                                                     |
| ------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| A      | قائمة الأفاتار + روابط شخصية موحدة + AccountLayout + صفحة الأمان ونقل إجراءات الجلسة | التنقل يعمل على الجوال/سطح المكتب ولوحة المفاتيح، الزائر/المستخدم/تعذر الجلسة واضحون، ولا روابط لميزات غير منفذة. يضاف رابط المدفوعات عند إنجاز B. |
| B      | endpoint سجل المدفوعات + Action/Hook/صفحة + رابط الأفاتار والتنقل                    | ملكية صحيحة، pagination، حالات دفع واسترداد منفصلة، وفراغ وخطأ وتحميل بالعربية والإنجليزية.                                                        |
| C      | فلاتر الحجوزات من Backend حتى URL والواجهة                                           | الفلتر يطبق على كامل السجل، التنقل للخلف يعمل، والتوقيت والحالة لا ينتجان تصنيفًا مضللًا.                                                          |
| D      | زر طباعة التذكرة وتنسيق الورقة                                                       | QR واضح، تذكرة مؤكدة فقط، لا طباعة عبر cached ticket أُلغي أو تعذر تحديثه، وفحص معاينة الطباعة. لا توليد PDF جديد.                                 |
| E      | صفحات الشروط والخصوصية ومسوداتها وروابطها                                            | تخطيط قراءة واضح وروابط صحيحة وترجمة؛ النشر النهائي للنص بعد المراجعة.                                                                             |
| F      | مراجعة UX شاملة + إغلاق التنظيف ورسم التدفق                                          | فحص رحلة الزائر والدخول والمقاعد والتعارض والدفع والعودة والتذكرة والخروج والجوال وRTL، وتوثيق تدفق Auth/API بناءً على الكود النهائي.              |

كل دفعة commit مستقل بعد التحقق؛ لا push دون طلب صريح. التحقق المناسب: TypeScript وESLint والبناء وتجربة متصفح للحالات المتأثرة، وفحوص ملكية/ترقيم/فلترة معزولة عند تغيير API. لا إضافة ملفات اختبارات دائمة وفق طلب المالك، ولا معاملات مالية أو تغيير بيانات حقيقية لتمرير المعاينة. لا حذف التعديلات الموجودة غير المرتبطة بالخطة.

Dashboard يبدأ بعد إغلاق هذه الدفعات أو تأجيل بند منها صراحةً؛ لا ندعي انتهاء الموقع بمجرد وجود صفحات شكلية.

### تنفيذ دفعة الحساب والأفاتار وتعديل الملف الشخصي — 2026-10-22

- تعديل المالك على الخطة: أصبحت صفحة /account تدعم تعديل الاسم والهاتف، بدل العرض فقط. البريد للعرض؛ تغييره يحتاج تحققًا جديدًا منفصلًا. الأفاتار صورة SVG افتراضية محلية موحدة بدل أحرف الاسم، دون رفع صور أو خدمة خارجية.
- AccountMenu يستخدم عناصر shadcn المبنية على Radix المثبت: ملف شخصي، حجوزات، أمان وجلسة، وخروج مع loading/error. لا busy مكرر. رابط المدفوعات يُضاف عند اكتمال صفحته وAPI في الدفعة B، ولا روابط معطلة لصفحات مستقبلية.
- accountLinks مصدر الروابط المشترك، وAccountLayout إطار Server بتنقل جانبي على سطح المكتب وأفقي على الجوال. صفحة الحجوزات تستخدم الإطار نفسه، ونقلت AccountSessions إلى /account/security مع رابط استعادة كلمة المرور الحالي.
- PATCH /api/v1/auth/me يقبل name وphone فقط عبر Schema strict مشتقة من قواعد التسجيل. المستخدم من requireAuth وليس body؛ حماية CSRF وتحديد 20 تحديثًا في الدقيقة لكل مستخدم، ورفض query parameters والحقول الإضافية. التحديث ذري ومقيد بـid والحساب النشط، ويرجع publicUser الآمن. لا migration ولا تعديل للحجوزات أو البريد أو كلمة المرور أو الدور أو التوكنات.
- account.actions يتحقق من المدخل مجددًا ويستخدم fetchWhenSignedIn الحالي؛ useProfile يدير mutation ويحدث authKeys.me عند النجاح بشرط أن يظل الحساب نفسه داخل الكاش. لا إعادة إحياء مستخدم خرج أو استبدال حساب آخر باستجابة حفظ متأخرة. أخطاء الحفظ تحتفظ بالنموذج، والاسم الجديد ينعكس في الهيدر فورًا.
- التحقق: نجح TypeScript للـAPI والويب وبناء الإنتاج وESLint لملفات هذه الدفعة. اجتاز 22 فحصًا معزولًا للمسار والخدمة والـAction والكاش. معاينة المتصفح مع API وهمي غطت الحفظ وتحديث الهيدر وإعادة التحميل والتحقق من الهاتف وفشل الحفظ وحفظ المدخلات والتنقل للجلسات وتأكيد الخروج ولوحة المفاتيح والعربية/الإنجليزية وRTL وعرض 390px دون تجاوز أو أخطاء JavaScript. لا حساب أو قاعدة بيانات أو بريد أو Paymob حقيقي ولا اختبارات دائمة في المستودع.
- فحص ESLint العام متعطل بتعليق سابق في useSeatSelection.ts يشير إلى react-hooks/exhaustive-deps غير المثبتة؛ لم يغير هذا العمل الملف أو إعدادات ESLint. أنواع Next القديمة تجددت بالبناء ثم نجح typecheck:web. تبقى بقية الدفعات B–F مفتوحة، ولم تنشر مسودة الشروط والخصوصية.

### إغلاق الدفعة B: سجل المدفوعات والاستردادات — 2026-10-22

- أضيف GET /api/v1/account/payments عبر accountRoutes/accountController/accountPaymentService. requireAuth يحدد المستخدم من الجلسة، وpaginationQuerySchema يرفض userId وأي فلاتر غير مدعومة. المسار قراءة فقط برد no-store ولا يجري اتصالًا بـPaymob أو تغييرًا ماليًا.
- الاستعلام يبدأ من PaymentAttempt ويقيد booking.userId قبل limit/offset، ويربط علاقات one-to-one للحجز والجلسة والتسوية والاسترداد؛ لا قراءة events أو callbacks ولا تكرار صفوف بسببها. يعيد استخدام serializeBookingPayment لحالات الدفع الحالية بدل إنشاء قواعد جديدة. ترتيب createdAt ثم id تنازلي، وقراءة limit+1 تحدد hasMore بدقة دون count مستقل. الفهارس الحالية تكفي لهذه الدفعة، ولا migration.
- الرد صريح: id وbookingId وreference وتاريخ المحاولة ومبلغها والعملة وحالة الحجز والدفع، وrefund بحالته ومبلغه وتاريخ الإنشاء وآخر تحديث. لا بيانات بطاقة أو هوية المزود أو checkout URL أو مفاتيح idempotency أو معلومات حسابات أخرى. المبلغ المعروض محاولة مسجلة، وليس إثبات خصم؛ تاريخ تحديث الاسترداد ليس وعدًا بموعد وصول المال.
- أضيفت /account/payments بالعربية والإنجليزية داخل AccountLayout، وربطت بقائمة الأفاتار والتنقل عبر accountLinks الواحد. القائمة تعرض حالات الدفع والاسترداد منفصلة، وإلغاء الشركة، ورابط الحجز ومواعيد القاهرة، وفراغًا صحيحًا لأول صفحة ونهاية السجل، وتحميلًا وخطأ وإعادة المحاولة وpagination. لا زر إلغاء أو إصدار استرداد أو دفع جديد.
- Server Page يتحقق من offset ويحضر اللقطة الأولى بالمسار الحالي، وaccount.actions يتحقق من المدخل ويستخدم fetchWhenSignedIn، وusePaymentHistory يدير TanStack بمفتاح userId/locale/offset. لقطة SSR الجديدة تتقدم على كاش قديم، ولا تُعرض بيانات حساب آخر بعد الخروج أو تبديل المستخدم. ظهور التبويب النشط في شريط الجوال يتم تلقائيًا دون state store إضافي.
- التحقق: نجحت أنواع Backend والويب وبناء الإنتاج وESLint لملفات الميزة. اجتاز 35 فحصًا معزولًا للملكية والحقول الآمنة وحدود الترقيم وحالات الدفع/الاسترداد وHTTP وActions ومفاتيح الكاش وأولوية SSR. تجربة متصفح على بناء الإنتاج وAPI وهمي غطت الدخول والعودة للسجل، 20 صفًا ثم 3 بلا صفحة تالية وهمية، السابق، القائمة، فشل التحديث والتحميل الأول وإعادة المحاولة، السجل الفارغ والنهاية، العربية/الإنجليزية وRTL و390px، وظهور التبويب كاملًا والخروج دون بيانات قديمة. لا أخطاء JavaScript ولا تجاوز أفقي؛ لم تُجر معاملات Paymob أو قراءة/تعديل قاعدة بيانات أو إضافة اختبارات دائمة للمستودع.
- ESLint العام ما زال يفشل بسبب تعليق سابق في useSeatSelection.ts يشير إلى قاعدة react-hooks/exhaustive-deps غير المثبتة؛ خارج ملفات هذه الدفعة. هذه الفحوص ليست تجربة جديدة للدفع الحقيقي أو قياس أداء على بيانات الإنتاج. التالي الدفعة C: فلاتر الحجوزات، ثم الطباعة والشروط والخصوصية ومراجعة UX وفق الخطة.

### تصحيح تنبيه تعذر الاتصال أثناء تحديث السجل — 2026-10-22

- في البيئة المحلية ظهرت بيانات SSR الصحيحة بينما يفشل تحديث Server Action أحيانًا. سجل Next المتراكم احتوى أخطاء Cannot read properties of undefined (reading 'apply')، ومسارات بناء تطوير قديمة من مراحل تنظيم سابقة. كان الويب وAPI يعملان، ونجحت ثلاث قراءات تحديث قبل التنظيف؛ لذلك الفشل متقطع ولم يُدعَ وجود إعادة إنتاج حتمية لكل خطأ Next نفسه.
- أعيد تشغيل Next dev الخاص بالمشروع بعد حذف مجلد .next/dev المولد فقط مع التحقق من المسار والعمليات. لم يُوقف API أو تُعدّل قاعدة البيانات أو حجوزات/مدفوعات المستخدم. نجحت بعدها خمس قراءات تحديث متتالية في حساب المستخدم الحقيقي دون تنبيه، ولم يظهر خطأ apply في سجل السيرفر الجديد؛ بقي تحذير hydration من إضافات المتصفح خارج نطاق هذا التصحيح.
- invokeAction كان يحوّل جميع الاستثناءات إلى NETWORK_ERROR. أُضيف تمييز لاستثناء Next الذي يحمل digest وإرجاع SERVER_ACTION_FAILED برسالة آمنة عن خطأ الخادم بدل الادعاء بمشكلة شبكة. فشل النقل الحقيقي يظل NETWORK_ERROR، وردود Backend الناجحة/الفاشلة لم تتغير. لا كشف digest/stack للمستخدم ولا إعادة تلقائية للكتابات أو الدفع؛ يظل الخطأ ذو النتيجة غير المؤكدة مصنفًا كذلك.
- فحص معزول أعاد إنتاج سوء التصنيف أولًا وفشل، ثم اجتازت أربع حالات بعد الإصلاح: خطأ خادم، انقطاع نقل، رد Backend فاشل، ورد ناجح. نجح TypeScript للويب وESLint للملف المعدل. لا اختبارات دائمة جديدة في المستودع؛ إصلاح حالة تشغيل التطوير لا يضمن منع كل عطل مستقبلي في HMR.

### إغلاق الدفعة C: فلاتر سجل الحجوزات — 2026-10-22

- أصبح GET /api/v1/bookings يقبل filter من all/upcoming/past/expired/cancelled، مع limit وoffset الحاليين. القيمة الافتراضية all؛ المدخلات الإضافية والقيم غير المدعومة مرفوضة، والملكية من المستخدم المصادق عليه. الفلترة في استعلام قاعدة البيانات قبل pagination، مع ترتيب createdAt تنازليًا ثم id تصاعديًا كما كان.
- القادمة: رحلة SCHEDULED مغادرتها مستقبلية، والحجز RESERVED أو CONFIRMED أو PAYMENT_PROCESSING، أو PENDING_PAYMENT لم تنته مهلته. السابقة: CONFIRMED لرحلة مجدولة غادرت أو حان موعد مغادرتها. المنتهية: EXPIRED أو PENDING_PAYMENT انتهت مهلته، دون انتظار العامل الخلفي. الملغاة: رحلة CANCELLED مهما كانت حالة الحجز؛ لا تتكرر في الفلاتر الأخرى. الدفع الجاري بعد المغادرة يبقى في الكل ولا يصنف منتهيًا. تستخدم القراءة لحظة واحدة من وقت الخادم للتصفية وتسلسل الحالة معًا.
- الرد يحتفظ بـitems وpagination ويضيف filter وhasMore. قراءة limit+1 تمنع زر التالي الوهمي. لا count منفصل أو migration أو تعديل للحجوزات أو سياسة الإلغاء أو الدفع.
- صفحة /bookings تحفظ filter وoffset في URL؛ تغيير الفلتر يعيد offset إلى صفر، والرجوع وإعادة التحميل يحفظان الاختيار. Server Page تحضر اللقطة الأولى، وAction تتحقق من المدخل، وTanStack يعزل الكاش بالمستخدم واللغة والفلتر والصفحة؛ لقطة SSR الأحدث تتقدم على الكاش القديم. لا تصفية محلية لصفحة واحدة؛ حالات الفراغ والنهاية والتحديث والخطأ بالعربية والإنجليزية.
- التحقق: نجحت أنواع API والويب وESLint لملفات الدفعة وبناء الإنتاج. اجتازت 33 حالة معزولة للملكية وحدود انتهاء المهلة والمغادرة وثبات ساعة الطلب وأولوية الإلغاء والترقيم وHTTP وAction والكاش. تجربة متصفح على بناء الإنتاج وAPI اصطناعي غطت الفلاتر الخمسة و20+5 نتائج والرجوع وتصفير offset وإعادة التحميل والفراغ ونهاية الصفحة والمدخل غير الصحيح وفشل التحديث وإعادة المحاولة وRTL وعرض 390px دون تجاوز أو أخطاء JavaScript. لم تتصل الفحوص بقاعدة بيانات أو Paymob ولم تضف اختبارات دائمة للمستودع.
- مشكلة ESLint العامة السابقة في تعليق useSeatSelection.ts لم تتغير؛ نجاح lint هنا خاص بملفات الميزة. لا تدعي هذه الفحوص قياس أداء PostgreSQL الحقيقي. الدفعة C مغلقة؛ التالي D: طباعة التذكرة، ثم الشروط والخصوصية ومراجعة UX. الحفظ محلي دون push.

### إغلاق الدفعة D: طباعة التذكرة — 2026-10-22

- أضيف زر طباعة التذكرة بالعربية والإنجليزية داخل صفحة التذكرة الحالية. لا مكتبة طباعة أو endpoint جديد أو إنشاء PDF في الخادم؛ يستخدم window.print ويمكن للمستخدم اختيار Save as PDF من نافذة المتصفح.
- useTicket يطلب GET التذكرة مجددًا من خلال Action الحالية في كل محاولة طباعة، ولا يعتمد على النسخة المخبأة. Backend الحالي يظل المسؤول عن ملكية الحجز وكونه مدفوعًا ومؤكدًا والرحلة مجدولة والمقاعد غير محررة. رفض الطلب أو تعذر تحديثه يخفي التذكرة القديمة ولا يستدعي الطباعة. readAt يجعل لقطة SSR الجديدة تتقدم على بيانات أو أخطاء TanStack القديمة.
- بعد نجاح التحقق يعرض hook لقطة الرد نفسها باستخدام flushSync، وينتظر document.fonts.ready وفك ترميز صورة QR؛ ثم يسمح بإظهارها في الطباعة ويفتح النافذة. خطأ الصورة يمنع الطباعة برسالة قابلة لإعادة المحاولة. الأزرار معطلة أثناء التجهيز، والتحديث عند استعادة التركيز/الاتصال متوقف أثناء تجهيز/عرض نافذة الطباعة حتى لا يستبدل اللقطة الجاري طباعتها. afterprint يمسح اللقطة والإذن بعد إغلاق النافذة أو إلغائها؛ كل محاولة جديدة تحتاج تحققًا جديدًا.
- Ctrl+P المباشر يعرض إرشادًا لاستخدام الزر بدل طباعة تذكرة لم تُفحص؛ لا يمكن انتظار طلب async داخل beforeprint. الطباعة ليست ضمانًا لاستمرار صلاحية التذكرة بعد هذه اللحظة، ولا يغير هذا العمل طريقة التحقق من QR عند الصعود أو يجعل النسخة الورقية تصريحًا مستقلًا.
- TicketView يحتفظ بالعرض والتنسيق وعناصر shadcn؛ منطق التحقق والطباعة داخل useTicket الموجود، دون ملفات helpers أو stores جديدة. تخطيط الموقع يحمل data-site-shell وصفحة التذكرة data-ticket-page. قواعد الطباعة تخفي Header/Footer وأزرار العودة والتحديث والطباعة وتستخدم ورق A4 بهامش 14mm، وشعارًا نصيًا وQR بعرض 55mm؛ بقية التنسيق Tailwind داخل العناصر. أسماء الركاب والمقاعد تمتد إلى صفحات إضافية مع منع انقسام صف الراكب نفسه.
- التحقق: نجح TypeScript للويب وESLint للملفات المعدلة وبناء الإنتاج. اجتاز Chromium 16 فحصًا على بناء الإنتاج وAPI اصطناعي، منها دخول/عودة، التحقق لكل محاولة، طباعة مباشرة مقفلة، إلغاء الرحلة وفشل Backend وإعادة المحاولة وQR تالف وتأخر التحقق وRTL و390px دون تجاوز وأخطاء JavaScript. عُرضت معاينات A4 ورُندرت ملفات PDF مؤقتة لمراجعة الورق: العربية والإنجليزية صفحتهما واحدة، وحجز 44 راكبًا ثلاث صفحات غير فارغة وبها أرقام الركاب ومرجع الحجز. اختبر الاستدعاء التفاعلي بنافذة print بديلة في المتصفح الآلي، ثم صدّرت معاينة CSS للطباعة؛ لم يُختبر جهاز طباعة فعلي أو جميع المتصفحات.
- لم تُلمس قاعدة البيانات أو البريد أو Paymob أو حجوزات حقيقية، ولم تُضف اختبارات دائمة أو ملفات المعاينة إلى المستودع. مشكلة ESLint العامة السابقة خارج هذه الدفعة لم تتغير. الدفعة D مغلقة؛ التالي E: صفحات الشروط والخصوصية ومسوداتها وروابطها، ثم مراجعة UX. الحفظ محلي دون push.

### تبسيط أدوات نتائج API والأخطاء — 2026-10-22

- بناءً على طلب المالك، دُمج shared/lib/appErrors.ts في apiResult.ts. حُذف resolveErrorMessage لأنه يعيد استدعاء errorMessage بنفس الوسائط، وحُذف errorCode ذو الاستخدام الواحد؛ errorCta يأخذ الخطأ ويفحص ApiError داخليًا. ErrorNotice يستورد errorMessage وerrorCta مباشرة من الملف المركزي. أزيل نوع ErrorCta المنفصل لأن TypeScript يستنتج حقول الرابط نفسها.
- لا توجد دوال غير مستخدمة في مجموعة الأدوات المتبقية: ApiResult لعقد الردود، ApiError للاستثناء المحلي، unwrapApiResult لقراءات Server وpolling، invokeAction لمواءمة Server Actions مع TanStack، errorMessage للعرض، errorCta لرابط الإجراء، isUnauthenticated لتنسيق المصادقة، isUncertainRequestError للحجز واستعادة كلمة المرور، validationError لـparseSchema، وapiFailure للنقل والمصادقة عند غياب رد صالح. جدول codeMessages هو رسائل احتياطية عند توفر code فقط.
- نجح TypeScript للويب وESLint للملفين المعدلين وgit diff --check، ولم تبق مراجع إلى الملف أو الدالتين المحذوفتين في web/src. مراجعة diff حافظت على نفس مجموعات الأكواد وروابطها وترجماتها. لا اختبارات دائمة جديدة أو تغيير لعقد Backend؛ الحفظ محلي دون push. تبقى الدفعة E للشروط والخصوصية هي التالية في خطة ميزات الركاب.

### توحيد إنشاء الأخطاء وتقليل الدوال — 2026-10-22

- تقلصت الدوال المصدرة في shared/lib/apiResult.ts من 8 إلى 6. أُزيل validationError وأصبح parseSchema يستخدم apiFailure(400, 'VALIDATION_ERROR', locale). أضيفت رسالة التحقق إلى codeMessages، وأصبح apiFailure يعيد استخدام errorMessage بدل تكرار ترجمة أخطاء المصادقة والنقل والتحقق.
- أُزيل errorCta واستُبدل بجدول errorLinks من نوع Map. ErrorNotice يفحص ApiError ويقرأ errorLinks.get(error.code) مباشرة؛ الأكواد غير المعروفة، بما فيها أسماء خصائص Object الموروثة، لا تنتج رابطًا. بقيت مجموعات الأكواد والوجهات والنصوص نفسها. استخدام Map هنا بيانات روابط وليس طبقة استدعاء جديدة.
- الدوال المتبقية: apiFailure لإنشاء نتيجة فشل، unwrapApiResult لاستخراج البيانات أو رمي ApiError، invokeAction لاستدعاء Action وتصنيف فشل النقل/الخادم قبل استخراج النتيجة، errorMessage لرسالة العرض، isUnauthenticated لحالة المصادقة المحددة، وisUncertainRequestError لنتائج الكتابات غير المؤكدة. لم تُدمج القراءة المتزامنة والاستدعاء غير المتزامن في دالة ذات أشكال مدخلات مختلفة.
- نجح TypeScript للويب وESLint للملفات الثلاثة المعدلة وgit diff --check. أعيد تشغيل 14 فحصًا معزولًا موجودًا لتصنيف أخطاء Actions وparseSchema وعمليات Actions. مقارنة مباشرة مع HEAD أكدت تطابق الروابط الـ12 ونتائج التحقق والمصادقة والنقل المستخدمة حاليًا بالعربية والإنجليزية وar-EG. لم تُجر اتصالات بخدمات حقيقية أو تُضف اختبارات دائمة؛ الحفظ محلي دون push.

### توحيد طلبات HTTP باسم apiFetch — 2026-10-23

- حُذفت الدالة requestApi، وأصبح apiFetch هو منفذ HTTP الوحيد ويعيد دائمًا { result, headers } داخل السيرفر. تستخرج الاستدعاءات المعتادة result؛ ويقرأ تسجيل الدخول وتجديد الجلسة headers أيضًا لاستخراج Refresh Cookie. لا خيارات تغيّر شكل الرد ولا تمرير Headers الخام في نتائج Actions.
- حُدثت استدعاءات auth.server.ts وauth.actions.ts وقراءة توفر الدفع في Route Handler. بقيت نتائج الميزات من نوع ApiResult، وكذلك بيانات المستخدم الآمنة وCookies وتجديد القراءة مرة واحدة وعدم إعادة إرسال الكتابات.
- نجح TypeScript للويب وESLint للملفات المعدلة وفحص whitespace، ولم تبق مراجع requestApi في web/src. لم تُرسل طلبات إلى Backend أو Paymob ولم تُجر تعديلات على قاعدة البيانات. التعديلات محلية دون push.

### تقليل دوال جلسة الويب — 2026-10-23

- دُمجت writeSessionCookies وclearSessionCookies وupdateSessionCookies في setSessionCookies(target, tokens)، فأصبح عدد الدوال المسماة مع قارئ المستخدم المخزن داخل render من 11 إلى 9. تمرر Middleware رد NextResponse، وتمرر Actions مخزن cookies الحالي. tokens الجديدة تُحفظ، وnull يمسح، وundefined لا يغيّر شيئًا.
- جُمعت بداية مسار GET والتحقق السابق للكتابة داخل fetchWhenSignedIn، مع استخدام مخزن cookies واحد. أصبح getSignedInUser يرسل auth/me بالتوكن المقروء مباشرة بدل إعادة قراءة cookies عبر مساعد آخر. بقي فصل قراءة SSR عن تجديد/كتابة cookies، ومحاولة التجديد الواحدة وعدم إعادة إرسال الكتابات وسياسة أخطاء الجلسة كما هي.
- نجح TypeScript وESLint وgit diff --check. نجحت 10 فحوص مؤقتة داخل الذاكرة باستخدام API وCookies وهميين لحالات الحفظ والمسح وعدم التعديل، والقراءة والتجديد ورفضه وتعذره، والكتابة مرة واحدة، وقراءة SSR دون تجديد، وحفظ التوكنات الجديدة عند فشل القراءة اللاحقة. لم تضف ملفات اختبار أو تُجر اتصالات خارجية أو تغييرات قاعدة بيانات؛ التعديلات محلية دون push.

### 2026-10-23 — مدخل واحد لطلبات الويب

- استبدال fetchWithAccessToken وfetchWithSessionRefresh وfetchWhenSignedIn باستدعاء apiFetch مباشرة في Features والصفحات والـProxy.
- إضافة Access Token تلقائيًا. Server Components تقرأ فقط؛ Actions وRoute Handlers تستخدم refreshSession: true لتجديد الجلسة وحفظ Cookies عند الحاجة.
- الـProxy يمرر sessionCookies من الطلب ويحفظ التوكنات المعادة على الاستجابة. تحقق الدور ما زال من Backend.
- حفظ إعدادات Cookies وقراءة بيانات جلسة الدخول في shared/lib/session.ts لتجنب اعتماد دائري. auth.server.ts أصبح خاصًا بقراءة المستخدم فقط.
- إبقاء إرسال HTTP وتجديد الجلسة دوال داخلية في api.ts، مع عدم إعادة إرسال العمليات الكتابية. لا تعيد Actions إلا result أو بيانات المستخدم المختارة.
- فحص نسخة المراجعة بـTypeScript وESLint و18 حالة معزولة دون اتصالات خارجية أو قاعدة بيانات. لا ملفات اختبارات دائمة في المستودع.
- تنسيق تجديد التوكن بين عدة عمليات سيرفر ما زال خارج نطاق هذه الخطوة.

### 2026-10-23 — حصر تجديد الجلسة في Proxy (يحل محل خيار refreshSession السابق)

- إضافة /api/:path* إلى matcher؛ مسار متابعة الدفع يمر بمصادقة الجلسة دون middleware اللغة.
- حصر تبادل Refresh Token في authMiddleware. تمرير Cookies الجديدة للطلب الحالي وحفظها في الاستجابة؛ رفض طلبات API العابرة للمواقع قبل التجديد.
- apiFetch تقرأ Access Token وترسل مرة واحدة فقط. حذف refreshSession وsessionCookies من خياراتها وحذف sendRequest الوسيطة.
- Actions وServer Components وRoute Handler تستخدم apiFetch بنفس الطريقة. يبقى تحقق Backend من التوكن والصلاحيات إلزاميًا، ولا يعاد تنفيذ الحجز أو الدفع إذا عاد 401 أو فشلت الشبكة.
- ردود API عند غياب/انتهاء الجلسة JSON 401، وعند تعذر التحقق JSON 503 دون مسح جلسة صالحة. ردود الصفحات تحتفظ بتحويل تسجيل الدخول المعتاد.
- تصحيح وصف التنسيق: Backend يتضمن بالفعل قفل Session واسترداد التوكن التالي خلال 30 ثانية بشروطه؛ Map في الويب تحسين محلي فقط. لم تتغير سياسة Backend.
- التحقق: TypeScript وESLint والتنسيق، و21 حالة معزولة باستخدام NextRequest/NextResponse الحقيقيين وHTTP وهمي؛ تشمل matcher وتمرير Cookies وتجديد الجلسة وطلبات Actions وعدم إعادة الكتابة. لم تُستخدم بيانات حقيقية أو Paymob.

### 2026-10-23 — تبسيط رد الجلسة وأدوات Cookies

- Login وRefresh يعيدان التوكنين ومدتي الصلاحية داخل JSON data؛ يلغي هذا استخراج Refresh من Set-Cookie المذكور سابقًا.
- session.ts يحتوي tokensSchema للتحقق من التوكنات فقط، ويستخدم Login نوع TypeScript لرد Backend دون schema للتحقق من الرد؛ يبقى التحقق من مدخلات المستخدم. بعد Refresh يتحقق Proxy من المستخدم والصلاحيات عبر auth/me. توجد ثلاث دوال Cookies واضحة: getSessionCookies وsetSessionCookies وdeleteSessionCookies، ويستقبل مخزن Cookies مباشرة.
- Login يحفظ التوكنات في HttpOnly Cookies ويعيد نجاح العملية فقط للواجهة؛ بيانات المستخدم تأتي من auth/me وتُخزّن عبر useAuth في TanStack Query. بعد الدخول تُمسح بيانات الحساب السابق ويُحدّث طلب المستخدم الحالي. Proxy وحده يجدد الجلسة، وapiFetch يقرأ Access لإرسال الطلب.
- طلب Refresh نفسه يبقى باستخدام Cookie إلى Backend. لا تغيير في قاعدة البيانات أو التدوير أو الصلاحيات. يجب نشر Backend وWeb معًا لتوافق شكل الرد الجديد.

- رد Login وRefresh يحتوي التوكنات ومدد صلاحيتها فقط؛ الدور ما زال ضمن Access Token وتتحقق منه صلاحيات Backend.

### 2026-10-23 — ترتيب تدفق Middleware

- authMiddleware يستدعي apiFetch مباشرة للتحقق والتجديد، ويحفظ Cookies الجديدة فور التجديد ثم يفحص دور المستخدم. حُذفت دالة refreshTokens ومتغيرات status/code الوسيطة وcatch المكرر لأخطاء الاتصال التي يعالجها apiFetch.
- مساعد reject محلي واحد يختار JSON أو Redirect/خطأ صفحة وينقل Cookies المحفوظة للرد النهائي.
- حُذفت Map تجميع Refresh في الويب؛ قد تصل عدة طلبات تجديد متزامنة إلى Backend، ويعالجها قفل Session واسترداد التوكن التالي خلال 30 ثانية وفق السياسة الموجودة دون تغييرها.
- تبقى حماية مصدر الطلب والتحقق من الدور وتمرير Cookies للطلب الحالي. انتهاء الجلسة يمسحها؛ تعطل Backend لا يمسحها.

### 2026-10-24 — توحيد متابعة الدفع مع Server Actions

- متابعة الحالة: TanStack Query → invokeAction → getPaymentStatusAction → apiFetch؛ القراءة محمية بالمصادقة وملكية الحجز في Backend، ولا تستدعي Paymob ولا تعيد checkoutUrl.
- حذف Route Handler الوحيد /api/payments/[bookingId]/status وpaymentStatusInputSchema غير المستخدم؛ يستخدم Action قاعدة bookingIdSchema الموجودة.
- حذف isApi وفروع JSON من Middleware، وحذف /api من matcher. Proxy يشغّل authMiddleware ثم intlMiddleware لجميع المسارات المطابقة.
- الإبقاء على فترات المتابعة 3/5 ثوانٍ وشروط توقفها وحماية الرد الأحدث. إلغاء Query يتجاهل رد Action المتأخر؛ لا يوقف تنفيذ Action على الخادم.
- هذا الإدخال يحل محل وصف متابعة الدفع عبر GET وفروع API في الإدخالات التاريخية السابقة. callbacks الخاصة بـPaymob تبقى في Express.
- أخطاء جلسة Action لا تتحول إلى Redirect/HTML داخل Middleware؛ يكتمل Action حتى يتحقق Backend من المصادقة والصلاحيات ويرجع خطأه عبر invokeAction. التحويل إلى Login/Forbidden يخص زيارة الصفحة، ومعالج 401 الموجود يمسح كاش الحساب ويحدّث الصفحة.

### 2026-10-24 — تبسيط API والمصادقة بعد الموافقة على المراجعة

- apiFetch يعيد ApiResult<T> مباشرة؛ حذف غلاف result/headers وتحديث الاستدعاءات الـ36 في 14 ملفًا. بقيت ردود Backend وServer Actions وبيانات status/retryAfter/requestId كما هي.
- Actions التي تحتاج فقط إرسال النتيجة تستخدم return apiFetch مباشرة. لا توجد دالة HTTP إضافية أو submit وسيطة.
- logoutAction يقرأ مخزن Cookies مرة واحدة. useAuth يحدد الحالة بشروط if/else بنفس الأولويات.
- Middleware يستخدم userResult وrefreshResult وhandleAuthFailure لتوضيح المعنى، دون تغيير شروط الدخول أو التجديد أو الدور.
- parseSchema يقرأ اللغة من الطلب عند خطأ المدخلات؛ حُذف وسيط اللغة الاختياري غير المستخدم. بقي دعم signal في apiFetch وإعدادات Cookies والتحقق من التوكنات وتوقيع سياق IP دون تغيير.

### إغلاق الدفعة E: مسودات الشروط والخصوصية — 2026-10-24

- أضيفت /terms و/privacy تحت /ar و/en كصفحات Server، مع PolicyPage مشترك لإطار القراءة، وعناوين وmetadata مترجمة، وتاريخ تحديث ثابت، وتنقل بين السياستين وفهرس داخلي يعمل بلوحة المفاتيح. يظهر الفهرس جانبيًا على سطح المكتب وقابلًا للفتح على الجوال، دون state أو مكتبة إضافية.
- النصوص مسودات واضحة للنسخة التجريبية وليست سياسات تشغيل معتمدة. تصف مهلة المقعد حتى عشر دقائق أو المغادرة، والتحقق من الدفع قبل التأكيد، وعدم استرجاع المقعد لدفعة متأخرة، وعدم إتاحة إلغاء الراكب، والاسترداد الكامل عند إلغاء الشركة للحجز المدفوع. تصف الخصوصية بيانات الحساب والركاب والمعاملات والجلسة ومشاركة الدفع والبريد بحسب التدفقات الموجودة، دون وعد بأن المزود لا يخزن بيانات الدفع أو باختراع مدة احتفاظ أو استرداد أو وسيلة تواصل.
- بيانات جهة التشغيل وقناة التواصل المعتمدة ومزودي الاستضافة والبريد وأماكن المعالجة ومدد الاحتفاظ وآليات طلبات البيانات ومدد الاسترداد تبقى مطلوبة للمراجعة قبل الإطلاق. metadata تحتوي noindex وfollow للمسودتين؛ يلزم مراجعتها مع اعتماد النص النهائي.
- أضيفت الروابط إلى Footer ونموذج إنشاء الحساب بالعربية والإنجليزية. روابط التسجيل إعلامية؛ لم يُضف مربع موافقة أو حقل أو تعديل في Schema أو طلب التسجيل أو Backend، ولم تُعتبر المسودة قبولًا تعاقديًا نهائيًا.
- التحقق: نجحت ESLint وأنواع الويب وبناء الإنتاج في نسخة مؤقتة بلا ملفات .env، وتنسيق الملفات المعدلة وgit diff --check. اجتاز Chromium 29 فحصًا شملت المسارات الأربعة و320/390/768/1024/1440px، وRTL/LTR والفهرس بلوحة المفاتيح وتبديل اللغة والروابط وnoindex وCookies قديمة دون Backend فعلي، دون تجاوز أفقي أو أخطاء JavaScript أو ترجمة. تمت مراجعة صور سطح المكتب والجوال. بقيت الترجمات السابقة مطابقة ولم تضاف اختبارات دائمة أو dependencies.
- أوقفت معاينة الواجهة المؤقتة ونُظفت نسخة البناء بحذر؛ لم تُقرأ بيئة حقيقية أو تُشغّل خدمات Backend أو قاعدة بيانات أو Paymob أو بريد، ولم يحدث نشر أو commit أو push. التنفيذ المحلي للدفعة E مكتمل؛ اعتماد النص النهائي قبل النشر ما زال مطلوبًا. التالي F: مراجعة UX الشاملة، قبل Dashboard.
