# Administration catalog lists

GET /api/v1/admin/cities and GET /api/v1/admin/stations require an authenticated
ADMIN or SUPER_ADMIN. Public cities/stations endpoints and all existing mutation
contracts remain unchanged.

Both accept strict query parameters: limit (1–100, default20), offset (0–100000,
default0), search (trimmed, max200, default empty) and locale (ar/en, default en).
Stations also accepts a cityId UUID. Search is a literal case-insensitive
substring across Arabic/English names; stations also matches both city names.
SQL wildcard characters are treated literally. Values are bound parameters.

Responses contain items, total and pagination:{limit,offset}. total is the count
after filtering, before pagination, and remains available beyond the last page.
City rows include stationCount across all stations. Station rows include
city:{id,nameAr,nameEn}. Page, totals and relations use one statement/snapshot.

Ordering uses the selected language's name then UUID in the database's configured
collation. It is deterministic across pages; punctuation/accent ordering may
differ from the former browser Intl.Collator. No ICU locale dependency or schema
migration is introduced. City picker options retain browser locale ordering.

Run npm run test:catalog --workspace @booking-bus/api for controller/validation
tests. SQL tests additionally require CATALOG_TEST_DATABASE_URL pointing to the
dedicated disposable 127.0.0.1:18985/catalog_test database; they reject other
targets. They create only the two catalog tables there and never load .env.
Use a fresh disposable database for each SQL run. Tests close their connections.
