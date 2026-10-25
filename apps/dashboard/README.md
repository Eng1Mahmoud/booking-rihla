# Rihla Dashboard

Independent staff application, following the same Next.js/React/TypeScript,
Tailwind, next-intl, TanStack Query, React Hook Form/Zod and Radix/Lucide stack
and feature structure as apps/web. The passenger application is unchanged.

## Run locally

From the repository root, install the locked workspace dependencies with npm ci.
Copy apps/dashboard/.env.example to apps/dashboard/.env.local and review its local
API and website URLs. The API's CORS_ORIGINS must allow the dashboard SITE_ORIGIN;
the committed API example already includes http://localhost:3001. No signing
secret is required by the dashboard to verify roles; the API remains authoritative.

- npm run dev:dashboard — dashboard at http://localhost:3001/en/dashboard
- npm run build:dashboard — production build
- npm run typecheck:dashboard — TypeScript
- npm run lint:dashboard — lint this application

Use an existing active, verified ADMIN or SUPER_ADMIN account. USER accounts
cannot enter the dashboard. Passenger account creation/recovery remains in the
passenger application. No administrator is created automatically.

## Structure

- src/app/[locale]: route layouts, login, forbidden and protected dashboard.
- src/features/auth: staff login/logout, server-side access and validation.
- src/features/dashboard: report components, server reads, schemas and types.
- src/shared: the existing web transport/form/UI conventions, scoped to this app.
- src/i18n and src/messages: Arabic/English routes, RTL/LTR and copy.

The overview reads GET /admin/statistics with travelDate and
GET /admin/payments/statistics with date. Operational figures concern trips
departing on the selected Cairo day; payment outcomes concern the last recorded
settlement update on that day. Gross paid is not net revenue or bank payouts.
Independent errors never turn missing reports into zeros. Exact money strings
are formatted with BigInt rather than unsafe floating-point conversion.

## Session separation

Development cookies are bus_dashboard_access and bus_dashboard_refresh.
Production uses __Host-dashboard_access and __Host-dashboard_refresh. Tokens
remain HttpOnly and are never serialized to HTML or a client query cache.
The existing proxy checks/refreshes sessions and current roles; server layouts
and report reads check staff access again. Logout clears this app's session and
query cache. Client-side role visibility is not an authorization boundary.

## Development evidence

.impeccable holds design references and workflow records; it is not a runtime
dependency or a public site directory. Its generated build/review/question
state is ignored by Git. The approved comp is a development reference only.
The runtime interface uses real text, controls and a data-driven SVG chart.
The English heading font is self-hosted with its Open Font License.

DASHBOARD_PREVIEW=synthetic enables an honest illustrative-data notice for a
separate synthetic preview; it does not supply data or bypass authentication.
Normal runs use the configured API and never substitute demo figures.

This first batch is the protected shell and overview only. Catalog, trip,
booking, staff/user and refund management follow in later feature batches.
Launch readiness and real-service integration testing remain deferred.
