# Rihla — agent instructions

## Communication and scope

- Explain work to the user in Arabic. Keep code identifiers in the project's existing language.
- The application source is D:/personal-projects/bus-booking-platform. The Codex registered workspace at C:/Users/engm9/OneDrive/Dokumente/ChatGPT/booking-bus contains supporting evidence and older snapshots; do not edit a stale copy of application source there.
- Start a fresh session by reading PROJECT_HANDOFF.md, the relevant IMPLEMENTATION_PLAN.md section, and actual git status. Load only the feature context needed.
- The owner handles commits and pushes. Do not commit, push, publish or deploy unless explicitly requested. Preserve unrelated work. After each completed feature, provide a ready Conventional Commit message.

## Code quality and patterns

- Prefer simple, readable, maintainable code. Avoid overengineering and unnecessary abstractions.
- Follow existing conventions. Reuse existing utilities before creating new ones.
- Simplify only recently modified code, preserve behavior/API contracts, and run relevant checks.
- Stack: npm workspaces; Next.js/React/TypeScript/Tailwind/next-intl for apps/web and apps/dashboard; Express/PostgreSQL/Prisma for apps/api. Read package.json for exact installed versions.
- Keep cities, stations and future domains as explicit feature modules. Separate presentation from data/controller hooks and Actions.
- Keep shadcn primitives in shared/components/ui. Shared composed components and business logic belong outside ui.
- Use Tailwind utilities in className. globals.css holds theme, fonts and base rules.
- Reuse shared DataTable/useDataTableState for tables, including centralized debounced search, filters, pagination and internal horizontal scrolling. Retain table presentation on mobile.
- Reuse shared ConfirmDialog/useConfirmation for confirmations throughout the application. Keep feature actions and permissions feature-owned.
- Follow the current API Route -> Controller -> Service -> Prisma pattern; no extra repository layer.
- Read ordinary environment values directly from process.env at their point of use, with simple defaults. Do not recreate env.ts, generic environment readers or per-setting wrappers. Keep essential startup/security checks in server.ts and payment checks in their owning provider/services; do not recreate config/paymob.ts or config/production.ts. Validate cryptographic keys where they are used.

## Safety and product constraints

- Preserve passenger/dashboard session separation and authoritative API role checks. UI visibility alone is not authorization.
- Preserve existing API contracts, passenger flows and booking/payment safeguards.
- Passengers cannot cancel bookings. Company cancellation requires a full refund; only Super Admin may issue it.
- Never expose .env contents, credentials, tokens or sensitive historic logs. Use committed examples for setup guidance.
- Prefer isolated synthetic verification. Do not reset or seed the application's database to test a feature. Production publication, real-money operations and live provider/worker side effects need explicit authorization.
- .impeccable contains development references and workflow records, not a runtime dependency. Respect existing ignore rules and do not bypass workflow review gates.

## Commands from the application repository

- API: npm run dev; npm run typecheck; npm run build.
- Passenger app: npm run dev:web; npm run typecheck:web; npm run lint:web; npm run build:web.
- Dashboard: npm run dev:dashboard; npm run typecheck:dashboard; npm run lint:dashboard; npm run build:dashboard.
- Owner preference: do not create test files or restore deleted tests/scripts/package commands. Verify with the existing build, type checks, targeted lint/format and manual UI checks; do not add testing infrastructure.
- Prefer targeted ESLint/Prettier checks for changed files; do not run repository-wide format --write.
