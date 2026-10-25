# Bus management

Targets: src/app/[locale]/dashboard/buses/page.tsx. Mode: operate. Code-led narrow
extension of the established fleet catalog. User approved this batch and said start.

## Direction contract

THESIS: Staff find a bus by plate and maintain its fleet assignments and fixed
seat template with existing API safeguards visible at the point of failure.

OWN-WORLD: Preserve navy rail, teal controls, white bordered tables, typography,
shared form and confirmation dialogs. No replacement world or design tokens.

STORY: Search plates, filter by type/status, inspect complete pages, add/edit bus
details, confirm deletion. Preserve server booking/trip constraints. Failed writes
stay open, successful writes refresh fleet data, focus returns to the trigger.

FIRST VIEWPORT: Current shell, title/Add, search/refresh with type/status filters,
then plate/type/seats/layout/status/amenities/actions table and pagination.
Mobile preserves table with internal horizontal scrolling and mirrored RTL shell.

FORM: Existing cities/fleet table composition; labeled form fields for plate,
capacity, nullable fixed layout/type, active checkbox and bounded amenity choices.
seed: 975b6d34b8d298dd (inherited from cities; narrow extension; no new roll).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Existing STANDARD_2_2 or null only. Picker data must be complete or fail explicitly.
No app data/real providers are used in verification. Old overview gate stays open.
