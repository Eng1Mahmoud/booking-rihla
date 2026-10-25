# Rihla — continuation handoff, 2026-10-25

## Authority and starting state

The user requested context-engineering and a new chat to continue completing the project. Explanations must always be in Arabic. Continue development in small cohesive feature batches using the existing roadmap and simple reusable patterns. The owner handles commits/pushes; requesting a commit message did not authorize Git mutations by the agent.

Application source: D:/personal-projects/bus-booking-platform.
Registered Codex project: booking-bus at C:/Users/engm9/OneDrive/Dokumente/ChatGPT/booking-bus (supporting evidence/older copies, not the application source).

Verified immediately before writing this handoff: git status --porcelain=v1 was empty; HEAD was 7992f24 `fix(api): correct city ID type comparison in station listing`. That commit contains the accumulated city/station, reusable table/dialog work and final API fix. Earlier 7129716 contains the standalone dashboard and reports. This handoff adds only AGENTS.md and PROJECT_HANDOFF.md as uncommitted documentation; verify actual status again. Remote push state was not checked. No app feature is being edited by the old chat.

## Read in order, selectively

1. Root AGENTS.md and actual git status/log.
2. IMPLEMENTATION_PLAN.md, especially Phase 12 and the current feature's requirements. Earlier unchecked milestones may be stale; confirm against code.
3. apps/dashboard/PRODUCT.md, README.md and DESIGN.md for dashboard conventions and approved visual direction.
4. One existing feature (cities or stations), the shared components it uses, and the API implementation for the next feature. Do not read every historic evidence file.

## What is complete

- Backend: catalog, fleet, routes/trips, auth/roles, bookings, payments/refunds, tickets and operator APIs exist. This is not a claim of production readiness; release verification and operations remain separate.
- Passenger website has its implemented flows; preserve apps/web while extending the staff dashboard.
- Independent dashboard sign-in/session, protected shell and date-filtered overview are implemented. Staff sessions use distinct cookies from passenger sessions.
- City/station CRUD is implemented with bilingual names/search, station city filter, server pagination, role checks and translated relationship failures.
- Cities and stations are separate features; features/catalog was removed. Each feature has Actions, schemas/types, columns, data hooks, controller hooks and presentation components. Do not resurrect generic kind-driven CRUD.
- Shared DataTable creates the TanStack table and imports its own toolbar/pagination. useDataTableState centralizes 300ms search debounce, typed filter strings and pagination/reset. Features pass columns/data/total/search labels and optional filter UI. API processes filtering/sorting/paging. Tables retain internal horizontal scroll on narrow screens.
- Shared ConfirmDialog is app-wide controlled shadcn UI (title/description/variant/labels/details/pending/error/callbacks). useConfirmation handles async pending/errors/reset and duplicate-submit protection, closing only on success. No global provider is needed.
- Shared FormDialog/footer, NameFields, NameColumns, RowActions, EmptyState/ListError, useDialogFocus/useActionErrors and server-only readListPage are available. Primitive UI stays in shared/components/ui; composed and logic components stay outside.
- API protected GET /api/v1/admin/cities and /admin/stations return items,total,pagination, using SQL search/filter/order. City rows include stationCount; station rows include city. Complete city picker options use separately cached bounded public pages. Every mutation invalidates the locations query family.

## Last bug and verified boundary

Real stations page repeatedly showed “The catalog could not be refreshed”. Root cause was PostgreSQL `operator does not exist: text = uuid`: SQL cast cityId to uuid while City.id and Station.cityId are text in the migrations. Removed only the incorrect cast in apps/api/src/services/adminCatalogService.ts. Corrected SQL test tables to use text and added unfiltered/filtered listing regression in apps/api/tests/adminCatalog.test.ts. Request UUID validation stays intact; no migration was needed.

Evidence: C:/Users/engm9/OneDrive/Dokumente/ChatGPT/booking-bus/dashboard-review/stations-read-fix/verification.md, red-tests.log and green-tests.log.

Checks from application root (all passed):

```powershell
node node_modules/typescript/bin/tsc --project apps/api/tsconfig.test.json
node node_modules/eslint/bin/eslint.js apps/api/src/services/adminCatalogService.ts apps/api/tests/adminCatalog.test.ts --max-warnings=0
node node_modules/prettier/bin/prettier.cjs --check apps/api/src/services/adminCatalogService.ts apps/api/tests/adminCatalog.test.ts
git diff --check -- apps/api/src/services/adminCatalogService.ts apps/api/tests/adminCatalog.test.ts
```

Actual SQL run from the registered C: workspace:

```powershell
node dashboard-review/table-controls/test-api.cjs
```

Runner creates only its owned disposable postgres:16-alpine container (127.0.0.1:18985/catalog_test), sets a test-only URL, runs source tests and removes the container. It does not use application env files. Before fix, 3 SQL tests reproduced the exact error; after fix all 8 passed with no skips. Prior feature split also passed production build/types/lint and 19 synthetic browser groups; details are in dashboard-review/feature-split/verification.md. Do not repeat all historical suites without a relevant reason.

Real authenticated Chrome at http://localhost:3001/en/dashboard/stations loaded 17 stations. Cairo filter returned 4; combined Arabic search رمسيس returned New Ramses only. Search and city filter were restored to defaults. API local base was http://127.0.0.1:4000/api/v1. Recheck running services; do not assume existing tab IDs or tokens. Do not extract credentials. No application records were changed for this check.

## Open issues and boundaries

- Earlier overview's native Impeccable workflow ledger remains open. Implemented dashboard UI does not imply that review gate passed. Do not claim workflow closure or bypass prior rejection. City/station extension is complete independently.
- Full production/launch checks, legal/operational details and CI work remain deferred; do not spend the next batch on them unless required or requested.
- Product text says later feature batches should be reviewed separately. Present a short concrete scope for the next batch, then proceed under the user's current request to continue; ask only if a material product decision is missing.
- Stable product rules: no passenger cancellation; company cancellation full refund, Super Admin only; exact money semantics; Cairo travel dates; gross paid is not net revenue.

## Prior next task — superseded by latest batch below

Continue Phase 12 with fleet management. Start with bus types and amenities as a bounded batch, then buses/plates/fixed seat templates, routes and trips. Read the existing API routes/services/schemas and dashboard city/station examples first; preserve backend safeguards and reuse the shared table/forms/confirmation pattern. Decide what API paging support actually exists from source; do not invent endpoints or fetch only a first page and present it as a complete list. Keep the approved Rihla design, Arabic/English, RTL/LTR, responsive table scroll and current-role checks.

After each batch, run relevant checks, demonstrate the result, update the roadmap/handoff and report in Arabic. Later roadmap work includes bulk trip creation, bookings/payments/refunds, users/admins/audit. Do not attempt all modules in one undifferentiated refactor.

## Latest batch — fleet metadata, 2026-10-25

Completed bus types and amenities at /dashboard/bus-types and /dashboard/amenities.
Source is still D:/personal-projects/bus-booking-platform; HEAD remains 7992f24.
No staging, commit, push or deployment was performed. All batch edits remain
uncommitted alongside the two original untracked handoff files.

Each explicit feature owns Actions/schemas/types/columns/data hook/controller
hook/manager/editor; no generic kind switch or CRUD factory. Shared DataTable,
useDataTableState, NameFields/Columns, FormDialog, ConfirmDialog, useConfirmation,
focus/errors/readListPage are reused. Business logic stays outside views/ui.
Both names and a normalized unique uppercase code are required. Existing fleet
write endpoints and assigned-bus/reserved-booking safeguards are unchanged.

API additions: adminFleetSchema/Controller/Service/Routes and app wiring for
GET /api/v1/admin/bus-types and /admin/amenities, guarded by the existing admin
middleware chain. Single SQL snapshots return filtered total and pages; names
and code use bound literal substring search, locale-name ordering and ID ties.
Existing fleet list endpoints remain pagination-only. No schema migration needed.

Verification evidence: registered workspace dashboard-review/fleet-metadata/.

- test-api.cjs: 15 HTTP/real PostgreSQL tests passed, zero skips. Uses only owned
  disposable container at 127.0.0.1:18985/catalog_test, removed after the run.
- run-checks.cjs: isolated production build and TypeScript, 12 browser groups,
  zero JS errors. Synthetic CRUD/search/paging/duplicate code, reserved edits,
  assigned deletes, focus/double-submit, uncertain-write/no-replay, stale-read
  recovery, mobile drawer and current-role Action check. 32 table/editor captures
  cover both features in ar/en at 1440/768/390/320; no document overflow.
- Browser verification caught strict Action input receiving internal filters;
  data hooks now explicitly project only search/limit/offset, matching cities.
- Mechanical detector ran once: four advisory existing 15px navigation sizes,
  no new system tokens. DESIGN.md and its sidecar remain unchanged.
- npm run test:catalog now includes adminFleet.test.ts and adminCatalog.test.ts.

Concurrent unrelated change detected after the batch began:
apps/dashboard/src/features/cities/actions/city.actions.ts requests limit=10
instead of 100, while its loop still advances/exits for 100. This agent did not
make or revert it. It can make station city options partial; preserve the owner's
change and clarify its intent before depending on complete city picker behavior.

Next bounded task: inspect existing Bus schemas/services/CRUD/seat-template
contracts and implement buses/plates/fixed template selection per Phase 12.
Then routes/trips, finite bulk creation, bookings/payments/refunds, users/audit.
Do not merge these into a broad refactor. Keep the old overview Impeccable gate
open; fleet review does not close or bypass that earlier rejected workflow.

## Fleet metadata review completion

Fresh independent finish review found no material UI correction and requested
only documentary FORM seed provenance. That correction was scored resolved;
the verdict pass returned ship at that scope. A separate documenter compared
the finished source/captures with the incumbent system: no token/system changes,
DESIGN.md and .impeccable/design.json preserved. Pre-existing documentation and
sidecar drift, including inherited 15px navigation advisories, was reported without
repair. The old overview native workflow gate remains open and untouched.

Final scoped Prettier/ESLint, API test TypeScript, API build and diff whitespace
checks passed. Synthetic preview/container cleanup and unchanged HEAD verified.
Evidence: external dashboard-review/fleet-metadata/verification.md, review.md,
design-comparison.md and final-quality.log. Next API boundaries are recorded in
next-api-notes.md; no bus implementation or bus/seat mutations have started.

## Latest batch — bus management, 2026-10-25

Starting git status was clean at e4a0184a7c4622e937edcd4eb368eda0ce264cc5;
the owner had committed the fleet metadata batch. This bus batch remains
uncommitted. Do not commit/push/deploy; give the owner a commit message after
each completed feature. Current suggested message:
feat(fleet): add bus management and seat template selection

Delivered /dashboard/buses as an explicit feature (schemas/types, Actions,
data/controller hooks, columns/default mapper, presentation/editor/filters).
Reuses DataTable/useDataTableState, Form/Input/Select, FormDialog, ConfirmDialog,
focus/error helpers. New shared FormSelect mirrors FormInput and is used for type
and template; new server-only readListOptions serves both metadata picker domains.
All picker pages load and validate total/IDs before use; failed/inconsistent
pages fail explicitly. Mutation/refresh invalidation keeps fleet options current.

The form preserves the API's exact plate normalization, integer capacity 1-100,
isActive boolean, nullable type, <=30 unique amenities and STANDARD_2_2/null layout.
Form strings convert through the feature Zod schema; no new layout or DB schema.
Existing Bus write services and atomic seat resizing/locks remain unchanged.
Localized errors cover duplicate plates, missing metadata/bus, booked-bus metadata,
trip-linked seat edits and referenced deletion. Uncertain writes are not replayed.

API: new adminBusSchema/Controller/Service/Routes, protected GET /admin/buses,
app service injection adminBuses. Single statement returns filtered total/pages
with joined type/amenities and plate+ID order; search is bound literal plate
substring. Existing bus list/mutation contracts are unchanged. Activity filter
uses a bound empty/true/false string converted by NULLIF::boolean because raw
Prisma interpolation does not accept a JavaScript null. False has explicit tests.

Evidence: registered C: workspace dashboard-review/buses. API runner owns only
postgres:16-alpine 127.0.0.1:18986/buses_test; 7 HTTP+SQL tests passed, zero skips,
container removed. Frontend runner builds an isolated source copy without env
files and uses only synthetic APIs: production build/types, 11 browser groups,
zero JS errors; 20 ar/en list/editor captures at 1440/1024/768/390/320 plus four
failure/empty captures. It tests 105 types and 105 amenities (second pages),
CRUD/defaults/nulls, validation/conflicts/refusals, option failures/inconsistency,
stale recovery/no uncertain replay, inner scroll, focus, drawer and demotion.
Preview source copy, server and browser are cleaned. No real app data/providers.

Next bounded batch: inspect Route API contracts and implement route management
with full station choices, directed uniqueness, duration and relationship errors.
Then trips, bulk preview/create, bookings/payments/refunds, staff/users/audit.
Old overview Impeccable native workflow remains OPEN. Do not infer closure from
this ordinary extension. Prior city picker limit=10 change is preserved and is
outside this bus batch; buses do not depend on city options.

## Owner verification preference — latest instruction

The owner confirmed removing API tests and most scripts intentionally. Do not
create any testing files, restore removed tests/scripts, or re-add package commands.
Finish current features with existing build/type/lint checks and manual UI checks.
Earlier successful test results are historical evidence only; test:catalog and
apps/api/tests are no longer available. This instruction supersedes earlier
test-setup/runner instructions in this handoff. Give a commit message after each
completed feature, without committing or pushing. Finish buses before starting
the next route batch. Existing removed files/package edits are preserved.

## Bus review disposition

The independent reviewer found no material visual or functional issue across the
24 captures and source, but returned fix for provenance of the inherited design
seed: the local check returns SEED UNKNOWN and original roll output is unavailable.
The inherited reference is present in overview/cities/fleet briefs; no new roll
was required or run for this narrow extension. This procedural provenance item
remains OPEN. Do not claim ship or native overview gate closure. The bus UI and
server behavior are implemented and checked. Deleted tests/scripts remain absent
per the owner's explicit instruction; future work must not recreate them.

## Environment access — final user decision, 2026-10-25

The owner explicitly chose direct process.env reads and removal of env.ts,
superseding the earlier parser convention and intermediate simplifications.
apps/api/src/config/env.ts is deleted; all parser imports/calls were removed.
No replacement environment abstraction or per-setting wrapper was introduced.

HTTP, database, mail, session cookies, payment setup, workers and existing local
tools read their required values directly with existing defaults. server.ts
retains CORS, proxy-hop, NODE_ENV and optional client-signing-key checks.
Database startup requires a PostgreSQL URL. Crypto utilities validate their
required 32-byte hex keys at use; redundant service prechecks were removed.
Mail transport retains paired-credential checks, and the email worker retains
preflight checks to avoid consuming outbox retries on missing configuration.
Production HTTPS/TLS, secret independence and payment validators remain.
Financial provider/worker behavior, locks and retry logic are unchanged.
Existing development-only seed/proxy guards reject production or unknown modes;
none of those tools were executed.

API typecheck/build and scoped ESLint/Prettier/whitespace checks passed. No test
files, scripts or dependencies were created or restored. Actual .env files,
database and providers were not accessed. Native .env-loading/dependency/package
cleanup and deployment remain separate work. No commit or push.
Suggested combined commit:
refactor(api): remove environment configuration wrapper

## Direct payment/production configuration — 2026-10-25

Owner approved deleting config/paymob.ts and config/production.ts too. Both are
removed; server.ts owns production HTTPS/TLS and independent-secret checks.
Paymob provider reads process.env directly by default and validates TEST keys,
merchant ids and URLs once at its boundary, including explicit caller settings.
Webhook configuration/signature validation stays in its service. Checkout,
reconciliation and refunds read their flags/scope directly. No parser replacement
or new configuration module was added. Availability reuses checkout construction
and now also stays closed for a missing/invalid encryption key.

Financial transaction bodies, retries, locks and signed-event persistence remain
unchanged. Existing payment inspection source files reuse provider validation;
no test files, scripts, commands or dependencies were added/restored. API typecheck,
build and scoped ESLint passed. Inline synthetic checks covered 42 provider cases,
28 checkout/webhook cases, 21 production cases, forged/disabled callbacks and
refund/reconciliation gates without database, env-file, network or worker access.
No commit/push. Suggested combined commit: refactor(api): inline environment configuration.

## Server entry point simplification — 2026-10-25

Owner requested removing most validation from server.ts. It now imports only
createApp, reads HTTP settings directly, starts the server and handles shutdown.
Removed startup checks for NODE_ENV, general CORS URL formatting, database,
auth/client key formatting, and payment/provider configuration. Database, crypto,
checkout and webhook validators remain at use, so invalid service configuration
is rejected when that service is used rather than blocking the whole API startup.
Retained bounded proxy trust, production HTTPS/TLS and secret independence only.
Graceful shutdown, database close, deadline and server error handling are unchanged.
API typecheck/build and scoped ESLint/Prettier passed; inline isolated checks
verified defaults and retained guards. No test files/scripts/dependencies added,
no DB/network/worker access, no commit/push.
Suggested commit: refactor(api): simplify server startup
