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
- src/features/cities: city list, editor, columns, data/controller hooks and protected Actions.
- src/features/stations: station list, city filter, editor, data/controller hooks and Actions.
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

Cities and stations are managed at /dashboard/cities and /dashboard/stations.
Both staff roles can create, edit and delete through the existing catalog APIs;
linked stations/routes block deletion with a translated explanation. Forms use
RHF/Zod and confirmed deletes, with server-side role checks on every Action.

Catalog rows are read from protected GET /admin/cities and /admin/stations.
The API applies bilingual literal search, station city filtering, language-selected
stable ordering and limit/offset pagination, returning the filtered total.
City rows include global station counts; station rows include their city names.
Only city picker options are loaded independently through bounded public pages,
cached separately; a later options-page failure never becomes a partial picker.
The station filter remains linkable through cityId and follows route changes.
Mutations invalidate all catalog pages, related city names/counts and options.

Tailwind utilities live directly in className; globals.css holds shared theme,
font and base rules. Catalog, trip, booking, staff/user and refund features beyond
cities/stations follow in later feature batches.
Launch readiness and real-service integration testing remain deferred.

## Reusable tables

Import DataTable and useDataTableState. The shared hook owns the input search,
300ms debounced request search, typed string filter values and controlled
pagination. params contains search/filters/limit/offset for the feature's query.
setFilter commits the filter and page reset atomically; resetFilters can receive
an explicit reset value for route-backed filters. No URL logic lives in shared UI.

DataTable creates the TanStack Table 9 instance internally. It renders its own
DataTableToolbar and DataTablePagination; features never import those directly.
The API already processes rows, so no second client filter/sort/page slice runs.
Page clamping waits for a confirmed total; loading/errors never become zero counts.
Search stays mounted during requests, so typing and focus survive page loading.

Each feature supplies columns, row identity, data/total, search labels and an
optional filter render function. The function receives the same shared state;
custom filters render controls and call its setters. Domain-specific empty content
and notices are composition slots. The shared table handles its empty-state
clear button. Forms, CRUD, API endpoints and permissions remain feature-owned.

```tsx
const list = useDataTableState({ initialFilters: { cityId: '' } });
const query = useStations(list.params);

return (
  <DataTable
    state={list}
    columns={columns}
    data={query.data?.items ?? emptyRows}
    rowCount={query.data?.total}
    getRowId={(row) => row.id}
    caption={t('stationsTitle')}
    isLoading={query.isPending}
    isFetching={query.isFetching}
    search={{ label: t('searchStations'), placeholder: t('searchPlaceholder') }}
    filters={(controls) => (
      <CityFilter
        value={controls.filters.cityId}
        onChange={(value) => controls.setFilter('cityId', value)}
      />
    )}
    onRefresh={() => void query.refetch()}
  />
);
```

Columns and fallback emptyRows must keep stable references. Include normalized
params and locale in feature query keys. Search text changes reset the first page
when the debounced value commits; filter changes also flush the current search.
Older query results are cached under their own key and cannot replace a newer
search. Preserve request error feedback and do not automatically retry writes.

Tables keep columns at every size with a 640px minimum width, keyboard-accessible
horizontal scroll inside the shadcn Table container and no page overflow.
Ordering is now database collation by the selected language's name and ID; it can
differ from browser Intl.Collator for punctuation/accents. Pickers keep Intl order.
The public passenger catalog endpoints remain unchanged. See ../api/ADMIN_CATALOG.md.

## UI components and ownership

The dashboard uses shadcn/ui (new-york, Radix) with components.json configured
for its existing aliases and Tailwind theme. shadcn components are owned source
files, not a single installed UI package. Add only components needed by the UI;
from apps/dashboard run npx shadcn@latest add <component> and review the diff.
Do not overwrite existing theme/RTL adaptations blindly.

- shared/components/ui: shadcn primitives only, such as Button, Input, Field,
  NativeSelect, Table, Dialog, AlertDialog and Sheet. Styling and primitive-level
  behavior belong here; no API calls, domain rules, next-intl or TanStack logic.
- shared/components/tables: DataTable composes shadcn primitives, toolbar and
  pagination; only the main component is imported by features.
- shared/hooks/useDataTableState.ts: common search/filter/pagination state.
- shared/lib/dataTable.ts: shared TanStack feature configuration and table types.
- shared/components/forms, feedback and layout: custom cross-feature components.
- features/<feature>/components and hooks: business rules, columns, filters,
  queries, mutations, localized dialog content and navigation behavior.

Table, Dialog, AlertDialog and Sheet come from the official new-york-v4 registry.
Their imports and default theme/motion were adapted to the existing dashboard.
Localized dialog close controls live in the feature; focus trapping, Escape,
portals and accessible title/description associations remain Radix behavior.

## Feature development pattern

Use cities and stations as the reference for interactive list features. Keep related
code inside features/<feature>, adding only directories that have a real use:

- components/<Feature>Manager.tsx: presentation only. Render the shared table,
  editor and confirmation from controller values/callbacks.
- hooks/use<Feature>.ts: coordinate selection, dialogs, notices, columns and focus.
  Keep requests and cache changes in the data hook.
- hooks/use<Feature>Data.ts: useQuery for reads and useMutation for writes through
  invokeAction. Own query keys, localized API errors and cache invalidation.
  Wait for invalidation before closing a successful form. Writes never auto-retry.
- lib/<feature>Columns.tsx: memoized domain columns. Do not create a separate
  table hook merely to repeat pagination, search state or row-model configuration.
- components/<Domain>Filter.tsx and <Feature>EmptyState.tsx: custom display only;
  values/setters come from the shared table state, with a thin route adapter
  when the feature has a linkable filter. No request logic in the filter.
- components/<Feature>Editor.tsx and Delete<Feature>Dialog.tsx: use shared RHF/Zod
  forms and shadcn dialogs. Own pending/validation/error presentation; delegate
  writes to callbacks. Prevent dismissal while an operation is pending.
- actions/<feature>.actions.ts: validate input, recheck staff access and call the
  API. Keep private helpers private and preserve the endpoint contracts.
- schemas and types: validation and shared feature types. Hooks must not import
  type definitions from UI components.

Data flow: route -> Manager -> controller hook -> data hook -> Actions -> API.
Shared table state owns search/filter/page values. The table owns toolbar and
pagination composition. Cities and stations share a locations query-key prefix
so mutations refresh related names/counts/options without a shared feature switch.
Share components only when their behavior is actually common. Keep entity rules
inside the feature; do not create a configurable CRUD framework for future work.

Simple login/date forms can stay in one file. Server-rendered report reads remain
server-only; they do not need client query hooks to imitate a list feature. This
pattern establishes responsibilities without forcing identical files everywhere.

## Application-wide confirmation dialogs

shared/components/dialogs/ConfirmDialog.tsx is a controlled shadcn AlertDialog
composition. It accepts open, title, description, variant (default/destructive),
confirmLabel, cancelLabel, pendingLabel, pending, error, onConfirm and onCancel.
children can supply extra details. Text defaults are localized. It knows no
entity types, API endpoints, permissions or action names.

useConfirmation owns execution state, error display values, reset and a synchronous
in-flight guard. It catches action failures and prevents duplicate execution.
The callback decides what to execute and closes the owning dialog only after
success. Failure keeps it open. No provider, global modal store or action registry
is required. Call reset when opening a fresh confirmation.

```tsx
const confirmation = useConfirmation(async () => {
  await publishReport();
  setOpen(false);
});

return (
  <ConfirmDialog
    open={open}
    title={t('publishTitle')}
    description={t('publishDescription')}
    confirmLabel={t('publish')}
    onConfirm={confirmation.confirm}
    onCancel={() => setOpen(false)}
    pending={confirmation.pending}
    error={confirmation.error}
  />
);
```

Destructive operations pass variant="destructive". Cancel/Escape cannot dismiss a
pending confirmation. useDialogFocus supplies shared trigger capture and fallback
focus restoration; pass its restore handler as onCloseAutoFocus when triggers
can disappear after a mutation. FormDialog shares only modal presentation and
footer controls. Feature editors provide their own schema, fields and callbacks.

The shared folder contains only genuinely reused pieces: dialog presentation,
confirmation/focus/error hooks, bilingual fields/columns, row actions and list
feedback/response parsing. Feature Actions validate inputs and call the existing
staff check; neither feature is configured through a generic CRUD factory.
