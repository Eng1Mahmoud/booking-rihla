# Frontend feature conventions

Use these conventions in apps/web and apps/dashboard. Keep working code simple;
apply them when changing a feature rather than reorganizing files without a reason.

## Files and responsibilities

- components/: presentation and small local UI state. Extract a hook when request,
  lifecycle or interaction logic makes the component difficult to follow.
- hooks/: React Query, browser lifecycle and feature interaction state. An optional
  useFeatureData hook separates substantial data logic from a page hook; do not
  add one for a single short query.
- actions/: async Next.js Server Actions that call the existing apiFetch client.
  Keep endpoint paths, request mapping and response types explicit.
- lib/: meaningful pure calculations or server reads. Keep single-use query
  configuration in its hook; do not create a file just to wrap an options object.
- schemas/: Zod schemas for forms and existing boundary normalization. Use DTO
  types for responses; do not add duplicate response or filter validation.
- types/: reusable data contracts. Keep component-only props beside the component
  and infer form values from their schema.

Create only folders the feature needs. Import directly from source files; do not
add index.ts or server.ts export aggregation files. Preserve actual server-only
modules such as auth.server.ts and their server-only boundary.

## Queries and mutations

- Use useQuery for reads, useMutation for changes, and invokeAction to unwrap
  action results. Do not add another API client or a generic CRUD framework.
- Write a local queryKey beside its query. A shared queryKeys file is useful only
  when multiple modules must agree on the same key, such as auth and bookings.
- Preserve key contents, locale and user identity. Private data must remain
  isolated between accounts; fresh server snapshots and cancellation guards stay.
- Use local queryOptions when fetchQuery and typed cache reads share one query.
  Reuse its key for refresh instead of repeating it.
- Keep independent requests parallel and reuse the existing cache. Fetch only
  data the page actually consumes. Preserve existing stale times and polling.
- Await relevant invalidation after a mutation. Preserve translated errors,
  confirmation dialogs, pending states and focus restoration.
- Expose query, save, remove and refresh where those operations exist. Use
  query.refetch directly when refreshing needs no additional work.
- Booking, payment, refund and boarding actions keep their existing idempotency,
  uncertain-outcome handling and retry protections. Camera and streaming lifecycles
  can use dedicated hooks rather than forcing every operation through React Query.

## Readability and UI

- Use one const/let declaration per statement, including individual React hooks.
  Keep initialization order unchanged. ESLint enforces this across feature files.
- Prefer named steps and early returns over dense expressions. Keep helpers that
  explain real business rules; remove wrappers that only add navigation between files.
- Keep dashboard table columns in a separate file. When columns need locale or
  translation hooks, use hooks/use<Entity>Columns.tsx and read that context inside
  the hook. Pass feature data and action callbacks explicitly. Pure column factories
  can stay in lib/<entity>Columns.tsx. Use useMemo only when stable references or
  measured calculation costs justify it. Reuse identical column definitions.
- Reuse existing shared components, Tailwind tokens and next-intl messages.
  Do not introduce CSS modules or another styling system.
- Keep simple components simple. Do not move a few lines into a hook merely to
  make every feature have the same number of files.

## Verification

Run affected workspace type checks and builds, root lint, scoped Prettier and
relevant behavior checks. Follow the README policy on test files and scripts.
State which behavior was actually exercised; builds do not verify live payments,
Gemini, camera permissions or authenticated workflows.

## Component boundaries

- Page components compose forms, previews and feedback. Extract a substantial
  independent UI section when it makes the page easier to follow.
- Read translations and locale inside the component or column hook that uses them.
  Pass required data and callbacks rather than the complete page hook result.
- Keep simple local state in the component. Comments explain non-obvious reasons
  and business constraints rather than describing each JSX element.

## Form validation

- Define a direct createFeatureFormSchema(t) factory in the feature schema file.
  Keep validation rules and their translated messages together.
- Form only uses zodResolver(schema); it does not translate validation issues.
  Server failures continue to appear in its general error alert.
- Infer form input/output types from the factory. Describe public API responses
  with TypeScript types instead of adding schemas used only for type inference.
- Keep shared rules in the same schema factory when existing Server Actions also
  validate them; translations may be optional for that server use.
