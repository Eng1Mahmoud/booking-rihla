# Bus Booking Platform — Implementation Roadmap

Status: Backend implementation is ready for local passenger-site/dashboard integration. Operator cancellation/full-refund policy is approved and implemented with durable notices, guarded TEST refund issuance/inquiry, request logs, PostgreSQL readiness and graceful shutdown. Actual Paymob TEST direct card payment, HMAC/inquiry confirmation, ticket and full refund were verified; LIVE deployment remains separate. Automated tests and GitHub Actions billing troubleshooting are deferred by the owner.

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
| Zustand                                                         | Explicit global client state: session state in memory, booking draft and cross-component UI state   | Owner-selected frontend tool  |
| React Hook Form + Zod                                           | Form state and browser validation, with server validation remaining authoritative                   | First account forms           |
| Native fetch                                                    | Small typed API transport with normalized errors, cancellation and explicit retry rules             | Foundation                    |
| Lucide React                                                    | Consistent icons; preserve physical seat orientation in RTL                                         | As needed                     |
| Intl                                                            | Cairo date/time, durations and EGP display                                                          | Foundation                    |
| Existing npm workspaces, ESLint, Prettier and TypeScript checks | Repository workflow and verification                                                                | Extend existing configuration |

Install current compatible stable versions at implementation time and preserve exact resolved versions in package-lock.json. Continue npm rather than adding another package manager. Owner decision: use Zustand for global client state. Keep small focused stores for authentication/session state in memory and the booking draft (tripId/selected seatIds), plus cross-component UI state only where needed. useState/useReducer still handle component-local state; React Hook Form owns form state; TanStack Query owns fetched server data. Do not copy API query results into Zustand. A selected seat in the store is a draft, never a reservation. Revalidate against the backend before creating a hold. Clear draft state after completion, expiry, logout or an incompatible trip change as appropriate. Do not persist access/refresh tokens, passwords, verification codes, passenger/contact information or checkout URLs in browser storage. If search/theme preferences are persisted, use a narrow allowlist and handle hydration deliberately. Create scoped store instances through a client provider when integrating with Next.js; avoid request-specific mutable server-module singletons and do not read or mutate client stores from Server Components.

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
