# Bus types and amenities management

Targets: src/app/[locale]/dashboard/bus-types/page.tsx and
src/app/[locale]/dashboard/amenities/page.tsx. Mode: operate. Ordinary code-led
extension of the existing city/station tables. The user explicitly requested
implementation after context checks, preserving the existing design.

## Direction contract

THESIS: Maintain two explicit bilingual fleet catalogs through familiar tables,
with searchable unique codes and clear server-enforced relationship safeguards.

OWN-WORLD: Inherit the navy rail, teal controls, white bordered panels, existing
type, spacing, fields, table and dialogs. Preserve DESIGN.md and its sidecar.

STORY: Search names or code, paginate complete totals, create or edit a record,
confirm deletion. Errors keep dialogs open; completed actions refresh the list
and restore focus. Bookings and assigned buses constrain edits/deletes.

FIRST VIEWPORT: Existing shell; localized title and Add button above the shared
search/refresh bar and bilingual name/code/action columns. Pagination stays below.
Narrow screens keep the table and internal horizontal scroll; shell mirrors RTL.

FORM: The established city/station composition, extended with an invariant LTR
code field and cell. seed: 975b6d34b8d298dd (inherited; narrow extension; no new
roll). Source: src-app-locale-dashboard-cities-page-tsx.md in this surfaces folder.
No new visual world or comp; new-work.md exempts precisely specified extensions
from running concept-seed.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

No rasters ship. Existing native overview review state remains open. Verification
evidence lives in the registered workspace's dashboard-review/fleet-metadata.

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
