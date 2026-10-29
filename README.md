# Rihla — Bus Booking Platform

Rihla is an Arabic/English bus-booking portfolio application. Passengers search
trips, choose seats, book and pay through Paymob TEST checkout, receive tickets,
and manage their account. A separate staff dashboard manages the catalog, fleet,
trips, bookings, payments, refunds, users and administrators.

## Project structure

| Location               | Purpose                                                                     |
| ---------------------- | --------------------------------------------------------------------------- |
| `apps/api`             | Express API, authorization, booking/payment services and Prisma data access |
| `apps/web`             | Next.js passenger website                                                   |
| `apps/dashboard`       | Next.js staff dashboard with a separate sign-in/session                     |
| `apps/api/migrations`  | Database migration history; retain the complete chain                       |
| `apps/api/src/prisma`  | Prisma contract and generated typed database artifacts                      |
| `apps/api/src/workers` | Local polling entrypoints; deployed jobs call the same services             |
| `compose.yaml`         | Local PostgreSQL development service                                        |

The stack uses Node.js, TypeScript, Express, PostgreSQL and the project's Prisma 8
prerelease ORM. Both frontends use Next.js, React, Tailwind, next-intl, TanStack
Query, React Hook Form, Zod and local shadcn-style UI primitives. Mailjet sends
email over HTTPS. Payment and refund integration currently supports Paymob TEST.
See each workspace's `package.json` and the lockfile for exact versions.

API code follows Route → Controller → Service → Prisma. Ordinary settings are
read directly from `process.env`; essential cryptographic/provider validation
stays with its owning code. There is no Redis/BullMQ dependency or Audit Log
feature. HTTP request logs go to stdout, with request IDs; they are not a database
audit table.

Frontend feature structure and data-flow conventions are documented in
[CODE_CONVENTIONS.md](CODE_CONVENTIONS.md).

## Local setup

Use Node.js 24.18.0, npm, and Docker Desktop if you want the supplied local
PostgreSQL service. Run commands from the repository root unless specified.

```sh
npm ci
```

Create local settings from these examples only when the destination files do not
already exist. Keep real values out of Git:

| Example                       | Local file                                                        |
| ----------------------------- | ----------------------------------------------------------------- |
| `.env.example`                | `.env` — local PostgreSQL container settings                      |
| `apps/api/.env.example`       | `apps/api/.env` — API settings, database and provider credentials |
| `apps/web/.env.example`       | `apps/web/.env.local` — passenger server settings                 |
| `apps/dashboard/.env.example` | `apps/dashboard/.env.local` — dashboard server settings           |

Set `DATABASE_URL` to your intended development database, with a URL-encoded
password. Match it to the root PostgreSQL settings if using Docker:

```sh
docker compose up -d postgres
```

Generate independent authentication secrets using the command below. Use a
separate generated value for each required secret; preserve established
production encryption keys.

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

For a new local database, apply the existing migrations from the API directory:

```sh
cd apps/api
npx prisma db migrate
```

The current local API environment may point to Supabase. Check the target before
running migrations; do not seed or reimport the deployed database just to verify
a feature. Existing deployment data was already imported.

Start all three applications together from the repository root:

```sh
npm run dev
```

- API: `http://127.0.0.1:4000/api/v1/health`
- Passenger website: `http://localhost:3000/ar`
- Staff dashboard: `http://localhost:3001/ar/login`

Set both frontends' `API_BASE_URL` to `http://127.0.0.1:4000/api/v1` for a local
API. Set their `SITE_ORIGIN` to their corresponding localhost origin. Keep API
`CORS_ORIGINS` aligned with those origins.

## Accounts and email

Set `MJ_APIKEY`, `MJ_SECRETKEY` and the verified Mailjet sender `EMAIL_FROM` in the
API environment. Run this optional local email polling process in another terminal:

```sh
npm run email:worker --workspace @booking-bus/api
```

Do not point an extra local worker at the deployed database while cloud schedules
are handling the same workload. Account mail is queued transactionally before
sending. Registration rejects an existing email with `409 EMAIL_ALREADY_EXISTS`.
Phone validation accepts international `+` numbers, strips copied direction marks
and surrounding whitespace, and rejects other invalid formats. Arabic phone
fields are right-aligned but keep LTR numeric order so the `+` prefix stays first.

Administrator changes use the dashboard's authorized management flow.
Passengers cannot cancel bookings. Company trip cancellation requires full
refund handling; only Super Admin can issue a refund. Refund Cron checks the
outcome of existing requested refunds and does not initiate a new refund POST.

## Commands and verification

All root commands apply to the complete project:

| Purpose                          | Command                |
| -------------------------------- | ---------------------- |
| Development                      | `npm run dev`          |
| Build                            | `npm run build`        |
| Production start                 | `npm start`            |
| Type check                       | `npm run typecheck`    |
| Lint                             | `npm run lint`         |
| Check formatting                 | `npm run format:check` |
| Format files                     | `npm run format`       |
| Formatting, lint and type checks | `npm run check`        |

`dev` and `start` use concurrently to run all three applications with named output
and stop the others if one exits. They do not start email or financial workers.
Run `npm run build` before `npm start`. Combined startup is for local use and
requires development dependencies to be installed.

Build and typecheck process every workspace in sequence and return a failure
if any workspace fails. Formatting with `--write` changes files; pass specific
file paths to Prettier when making scoped changes.

Hosted deployments use workspace-specific commands below so each service builds
and starts only its own application. The owner requested no new test files or
restored testing scripts; verification uses type checks/builds, scoped lint/format
and relevant manual checks.

## Ticket QR and gate boarding

Each confirmed, fully paid booking provides a signed QR for each passenger seat.
The passenger ticket page and print view show every code with its name and seat;
ticket emails attach one PNG per seat. The primary QR field remains available
for older clients. QR contents contain allocation identifiers and a signature,
not passenger contact details or payment credentials.

Gate staff sign in to the dashboard and open `/{locale}/dashboard/scan`.
STAFF accounts land on this page and cannot access administrator pages. A super
administrator can assign the STAFF role to an active, verified account; changing
roles revokes existing sessions. ADMIN and SUPER_ADMIN can also scan tickets.

Scanning verifies current ticket, payment, trip and seat eligibility. Verification
never records boarding. Confirm boarding stores the seat timestamp and staff
user; repeated/concurrent scans return the existing record. Boarding and operator
cancellation share the trip lock, so eligibility is re-read inside the transaction.
Business scan outcomes use HTTP 200 with a string envelope code and the outcome
in `data.code`; malformed requests and authorization failures remain HTTP errors.

The default boarding window is four hours before through two hours after departure.
Set `TICKET_BOARDING_HOURS_BEFORE` / `TICKET_BOARDING_HOURS_AFTER` on the API to
change it. Displayed scan times use Africa/Cairo. A dedicated 64-character hex
`TICKET_QR_SECRET` is optional; otherwise a separate signing key is derived from
`AUTH_CODE_SECRET`. Invalid configured keys fail closed. Changing the signing key
invalidates saved QR images; passengers must reopen their ticket to regenerate it.
Camera scanning uses BarcodeDetector where supported, with manual payload input
as a fallback; browser camera access requires HTTPS or localhost.

Apply tracked migrations from `apps/api` before running the updated API:

```sh
npx prisma db migrate
```

Migration `20261027T2204_ticket_boarding_staff` adds seat boarding fields, the
staff-user relation and STAFF to the existing role check. Its contract artifacts
accompany the migration. It replaces the old standalone boarding SQL;
installations that ran that legacy script need their schema reconciled with the
tracked contract before migration, preserving any existing boarding records.

## Dashboard translations

Dashboard messages live in `apps/dashboard/src/messages/{ar,en}/`, with one
JSON file per section (for example, `trips.json`, `payments.json`, and
`ticket-scan.json`). Each locale's `index.ts` explicitly maps these files to
next-intl namespaces. Add matching keys and interpolation variables in both
languages; keep existing namespaces when adding text to a feature. New sections
also need an entry in both locale indexes. The request loader selects one locale.

## AI booking assistant

The passenger chat uses a same-origin streaming proxy to the Express API. Set
`GOOGLE_GENERATIVE_AI_API_KEY` only on the API (`GEMINI_API_KEY` remains a fallback).
`GEMINI_MODEL` overrides the existing Flash-Lite model. Model availability and
free-tier entitlement must be checked for the owner's Gemini project.

The API example lists request rate, history, tool-step, output-token and timeout
settings. History is capped at 20 messages, steps at 10, output at 4096 tokens,
and the deadline at 120 seconds; invalid settings use safe defaults. Match
`AI_REQUEST_TIMEOUT_MS` on the web app; its proxy allows five extra seconds.
The widget sends at most eight recent text messages and 12,000 characters,
without previous tool-result payloads. It keeps the visible conversation locally.

A short-lived HttpOnly, SameSite cookie scopes public conversation filters to a
browser; a verified access-token session also scopes them when signed in.
Filters expire after 30 minutes and are process-local, so API restarts or another
replica lose them. No new database tables are used. Read-only tools return public
fields only; live seat counts use the existing seat/hold rules and are snapshots
at search time. Booking and payment continue on the ordinary trip page.

The panel supports retry, stop, new chat, keyboard focus/Escape, Arabic/English,
and editable browser speech input with permission/error feedback. Structured
station/city results link to the existing directory, which accepts a validated
city filter and station anchors. The catalog currently has names/cities, not
verified street addresses or coordinates. Search actions reuse the shared
DatePickr/TimePicker and preserve the conversation; trip-details actions use a
validated selected-trip ID without exposing it in the message text. The
all-trips link opens the normal results page for the same route/date, across
all departure times. Voice output is intentionally excluded.

## Deployment

- Passenger app and dashboard: Vercel, rooted at `apps/web` and `apps/dashboard`.
- API: native Node Web Service on Render; repository root directory left empty.
  Build: `npm ci --include=dev && npm run build --workspace @booking-bus/api`.
  Start: `npm start --workspace @booking-bus/api`.
- Database: existing Supabase PostgreSQL project, using its configured pooler URL.
- Email: Mailjet HTTPS API, not SMTP.
- Scheduling: Supabase Cron dispatches authenticated HTTP requests to Render.

On Render set `NODE_ENV=production`, `HOST=0.0.0.0`, the intended `PORT`, the
appropriate trusted-proxy setting, HTTPS `CORS_ORIGINS`, and the existing database,
authentication, Mailjet and verified Paymob settings. Use `/api/v1/ready` as the
health check. Configure each Vercel frontend with the Render API's `/api/v1` URL.
Render Free can sleep or restart; the database outboxes and retry state preserve
pending work. A successful deployment alone does not certify provider delivery.

Paymob browser return goes to the passenger website's `/ar/checkout/result`;
notification goes to the API's `/api/v1/payments/paymob/webhook`. Browser redirects
alone are not proof of payment. A booking hold lasts up to ten minutes from
creation; Paymob receives the remaining time rather than a new ten-minute window.

## Scheduled jobs

All endpoints are POSTs below `/api/v1/internal/jobs`, protected by
`Authorization: Bearer <CRON_SECRET>`. Supabase reads the matching token from Vault
secret `email_cron_secret`. Do not paste the token into committed SQL or frontend code.

| Supabase job         | Endpoint        | Current schedule                     |
| -------------------- | --------------- | ------------------------------------ |
| `rihla-email`        | `/email`        | Every 30 seconds                     |
| `rihla-booking`      | `/booking`      | Every minute                         |
| `rihla-payment`      | `/payment`      | Every minute                         |
| `rihla-refund`       | `/refund`       | Every 5 minutes at minutes 2, 7, 12… |
| `rihla-auth-cleanup` | `/auth-cleanup` | Hourly at minute 17                  |

The existing cloud jobs are already created; do not recreate them while setting
up a local checkout. API handlers process bounded batches with existing locks and
retries. Check `cron.job` for schedules and `net._http_response` for actual HTTP
results. Cron history confirms SQL dispatch, not business completion. HTTP 200
with `enabled: false` means the financial capability is disabled. Inspect job
counters and provider results before claiming end-to-end success. Email delivery
remains at least once across a crash after provider acceptance.

## Remaining verification

- Verify the deployed Paymob TEST lifecycle: success/decline, authenticated
  webhook/inquiry recovery, expiry, trip cancellation, requested-refund
  reconciliation and notices. Local payment verification does not establish
  complete hosted verification.
- Verify backup/restore in an isolated environment without overwriting live data.
- Finalize terms/privacy using the owner's actual policies before commercial use;
  the current pages are portfolio drafts.
- Monitor job counters, queue backlogs and REVIEW/mismatched cases alongside
  provider results.

## Development conventions

The application source is `D:/personal-projects/bus-booking-platform`. The registered
Codex folder at `C:/Users/engm9/OneDrive/Dokumente/ChatGPT/booking-bus` contains older
snapshots/evidence. This README is the project's single documentation file.

Keep changes small and follow existing feature modules. The dashboard reuses
DataTable/useDataTableState and ConfirmDialog/useConfirmation; shared UI primitives
stay in shared/components/ui. Use Tailwind utilities for layout and globals.css
for theme, fonts and base rules. Preserve API role checks, passenger/staff session
separation and booking/payment safeguards. Phone numbers retain LTR order with
right alignment in Arabic.

Use existing typecheck/build and scoped lint/format checks. Do not recreate removed
utility/test scripts, add test files or a docs folder. Keep dependency changes
scoped to the requested work and retain migration history. Preserve private environment files and ignored backups;
the local API environment currently targets Supabase. Use isolated synthetic
verification. Provider operations, production writes and deployment require the
owner's explicit instruction. Existing Cron jobs and Vault secrets must not be
recreated or changed as part of local setup. The owner handles commits and pushes.

## Font attribution

The dashboard uses Wix Madefor Display 700 from Google Fonts for English headings.
Its license is retained in
`apps/dashboard/public/fonts/OFL-Wix-Madefor-Display.txt`.
