# Bus Booking Platform

A bus booking application for Egypt, built in focused feature batches with explanations.

## Current feature: Super-admin administrator management

Implemented: an Express + TypeScript API with a health endpoint, centralized JSON error responses, validated startup settings, Helmet security headers, JSON body parsing with a 100kb limit, and an explicit CORS allowlist. The health endpoint checks that the API responds. Local PostgreSQL setup is now defined in compose.yaml; Prisma 8 backs catalog management, trips, repeatable demo data, and passenger trip search; the health endpoint remains independent of the database.

See [the implementation roadmap](IMPLEMENTATION_PLAN.md) for the planned phases and features. Keep project planning in this root file; step-by-step code explanations are provided in the chat.

## Run locally

Prerequisites: Node.js 24.11 or later and npm. Run commands from the repository root.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4000/api/v1/health in your browser. Expected response:

```json
{ "status": "ok" }
```

Stop the server with Ctrl+C. Development mode restarts it when source files change.

## Configure the API

Configuration is optional: the defaults are development mode and port 4000. To customize them, copy the safe example using PowerShell from the repository root:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

Only copy if you have not already created your local configuration. Edit `apps/api/.env`, for example:

```dotenv
NODE_ENV=development
PORT=4500
```

Run `npm run dev` and open http://127.0.0.1:4500/api/v1/health. Restart the server after changing the environment file.

The API workspace commands load its own optional `.env` file using Node's built-in environment-file support. Existing terminal environment variables take precedence. The supported settings are:

| Setting    | Default       | Accepted values                                |
| ---------- | ------------- | ---------------------------------------------- |
| `NODE_ENV` | `development` | `development`, `test`, `production`            |
| `PORT`     | `4000`        | Digits representing an integer from 1 to 65535 |

Blank values are invalid. Invalid settings stop startup and identify the affected field without dumping environment values.

## Verify and build

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Stop the development server before `npm start`; both use the configured port. `npm start` runs the compiled JavaScript produced by `npm run build` and loads the same optional environment file. HTTP tests choose an available port automatically.

Application code and tests are TypeScript. The compiler checks both, but only application code goes into `apps/api/dist`. Build output is generated locally and excluded from Git.

## Understand the code

Read these files in order:

1. `package.json`: root commands delegate to the API workspace. A workspace lets us add passenger and admin apps later in the same repository.
2. `apps/api/package.json`: API commands and dependencies. Node runs TypeScript directly in development; TypeScript separately checks types and builds JavaScript.
3. `apps/api/src/config/env.ts`: defines the Zod rules. `parseEnv` validates environment strings, applies defaults, converts the port to a number, and returns typed settings. It does not read files or start the server.
4. `apps/api/src/server.ts`: passes `process.env` to `parseEnv`, creates the app with the validated CORS origins, then starts it on the validated port. Invalid configuration fails before listening.
5. `apps/api/src/app.ts`: exports createApp(corsOrigins), which creates Express, configures middleware, and defines HTTP responses. A GET request to `/api/v1/health` returns JSON with status 200. Unknown paths receive JSON with status 404.
6. `apps/api/test/env.test.ts`: checks defaults, valid values, invalid values, safe errors, and failed startup.
7. `apps/api/test/health.test.ts`: starts a real HTTP server and checks its public responses with Node's built-in test runner.
8. `apps/api/tsconfig.json`: Node types and strict checking for both source and tests, automatically discovered by the editor. `tsconfig.build.json`: compiles only source files to `dist`.

Startup flow: optional environment file → process.env → parseEnv → app.listen.

Request flow: browser → server listening on the configured port → Express route → JSON response.

References: [Express setup](https://expressjs.com/en/starter/installing/), [Node's TypeScript support](https://nodejs.org/api/typescript.html), [Node environment-file loading](https://nodejs.org/api/cli.html#--env-file-if-existsfile), and [Zod schemas](https://zod.dev/api).

## Next feature

The reservation MVP is complete: authenticated seat reservations, server-priced totals, passenger ownership and current availability, without payment or passenger cancellation. Bus types and amenities are now implemented. Fixed seat templates now replace editable database grids. Batch trip preview and creation are now implemented. Administrator booking lists/details are now implemented. Passenger account listing and suspension/activation are now implemented. Super-admin-only administrator management is now implemented. Administrator audit logging and expiring checkout seat holds are now implemented.

## Git workflow

Group related implementation, validation, tests, migrations, and usage notes into one feature commit. Finish the feature, verify it, explain the result, commit, and push under the owner's standing instruction before starting the next. Finish the backend before the passenger website, then build the dashboard. Never commit `.env`, dependencies, or build output. The safe `.env.example` is committed so other developers know which settings exist. Git author identity is configured locally for this repository.

The owner has authorized pushing each completed feature after its checks. Production publication and real-money operations require separate explicit approval.

## Linting

Run npm run lint from the repository root. ESLint checks API source and TypeScript tests using recommended JavaScript and TypeScript rules. Intentionally unused function parameters may start with an underscore. The command reports problems without changing files, and fails on any errors or warnings. Generated output, dependencies, and coverage are excluded. The tool configuration is eslint.config.mjs; application code remains TypeScript.

## Formatting

Run npm run format to apply Prettier formatting, or npm run format:check to verify it without editing files. Configuration is in .prettierrc.json; exclusions are in .prettierignore. Generated output, dependencies, local environment files, and the npm lockfile are excluded. ESLint and Prettier run separately; eslint-config-prettier disables conflicting lint rules.

## Security headers

Helmet runs before the routes, so its headers apply to successful responses and 404 errors. The existing x-powered-by setting remains disabled. Default Helmet headers include X-Content-Type-Options: nosniff, Referrer-Policy: no-referrer, Content-Security-Policy, and Strict-Transport-Security. Helmet does not configure HTTPS, authentication, request body limits, or CORS. The current API uses the documented default configuration.

## JSON request bodies

The API parses application/json bodies before routes, with an explicit 100kb (102400-byte) limit. This makes parsed data available as request.body; it does not validate business fields. The default parser accepts JSON objects and arrays.

Malformed JSON returns HTTP 400 with INVALID_JSON. Bodies exceeding the limit return HTTP 413 with PAYLOAD_TOO_LARGE. Responses use the existing JSON error format and do not echo the submitted content.

This limit applies to the JSON parser, not every possible request content type or file upload. A valid POST to an unknown route returns the normal 404, while malformed or oversized JSON is rejected before routing. Supported create endpoints validate their parsed bodies separately.

The HTTP tests cover a small valid body, a body exactly at the limit, malformed JSON, and one byte over the limit. No new package was installed.

## CORS

CORS_ORIGINS is a comma-separated list of exact browser origins. The default is http://localhost:3000,http://localhost:3001. Update apps/api/.env and restart the API to change it; the safe example lists the setting.

Origins must use HTTP or HTTPS and contain only the scheme, host, and optional port, without a trailing slash, path, credentials, query, or fragment. Wildcards, null origins, empty entries, and malformed URLs are rejected at startup. localhost and 127.0.0.1 are different hosts, so add both explicitly if needed.

The server validates the environment once and passes env.CORS_ORIGINS to createApp. Tests call createApp with their own allowlist. CORS runs before JSON parsing so allowed browser origins can read validation error responses.

Allowed requests receive Access-Control-Allow-Origin with the matching origin and Vary: Origin. The middleware handles OPTIONS preflight requests. Unlisted origins receive no Access-Control-Allow-Origin; a direct HTTP client can still receive the response. Requests without Origin continue normally.

CORS is enforced by browsers and is not authentication, authorization, or CSRF protection. Credentialed requests are now enabled for the exact origin allowlist; session mutations additionally enforce origin and CSRF-header checks. Tests verify response headers and preflight behavior using HTTP requests; they do not run a browser.

Example check after starting the API:

```powershell
curl.exe -i -H "Origin: http://localhost:3000" http://127.0.0.1:4000/api/v1/health
curl.exe -i -H "Origin: https://unlisted.example.com" http://127.0.0.1:4000/api/v1/health
```

Use the configured port if it differs from 4000. The first response includes Access-Control-Allow-Origin; the second does not.

## Local PostgreSQL

Docker Desktop must be running with Linux containers. The API still runs directly with npm; this step runs only PostgreSQL in Docker. Prisma and the City table are configured, and the API health endpoint does not check the database yet.

The root .env supplies Compose settings. It is separate from apps/api/.env, which supplies Node API settings. A local root .env with a generated password was created on this machine; do not overwrite it. On a fresh checkout, copy the root .env.example to .env and replace POSTGRES_PASSWORD before starting.

```powershell
# Fresh checkout only, when the root .env does not exist:
Copy-Item .env.example .env
# Edit .env and choose POSTGRES_PASSWORD, then:
docker compose config --quiet
docker compose up -d --wait postgres
docker compose ps
```

The default connection settings are:

| Setting   | Value                                      |
| --------- | ------------------------------------------ |
| Host      | 127.0.0.1                                  |
| Host port | 5432                                       |
| Database  | bus_platform                               |
| User      | bus                                        |
| Password  | POSTGRES_PASSWORD in the ignored root .env |

The published port is bound to the local machine. If port 5432 is occupied, choose another POSTGRES_PORT in the root .env. The port inside the container remains 5432.

Open a SQL session with the default user and database:

```powershell
docker compose exec postgres psql -U bus -d bus_platform
```

Then run:

```sql
SELECT current_database(), current_user;
```

Exit psql with \q. If you changed the database or user in .env, use those names in the command.

Stop and start the database:

```powershell
docker compose stop postgres
docker compose up -d --wait postgres
```

docker compose down removes this Compose project's container and network while retaining its named volume. The separate project name bus-booking-platform-dev prevents reuse of an older similarly named project volume found on this machine.

The postgres_data named volume stores PostgreSQL data outside the container's writable layer. The PostgreSQL 18 image mounts it at /var/lib/postgresql, as required by the official image. The pg_isready health check indicates server readiness; it is not an application-level query or an authentication test.

POSTGRES_DB, POSTGRES_USER, and POSTGRES_PASSWORD initialize a new empty database volume. Editing these settings later does not automatically change an existing database or password.

This configuration is for local development. See the [official PostgreSQL image documentation](https://hub.docker.com/_/postgres) for initialization and version-specific storage behavior.

Verification on this machine: PostgreSQL reports healthy; a real SQL query returns bus_platform and bus; the host port is reachable; a forced recreation produced a new container with the same database cluster identifier. No application tables were created. The previous similarly named volume was left untouched.

## Prisma 8 setup

The official [existing-app PostgreSQL guide](https://www.prisma.io/docs/prisma-orm/quickstart/existing-app/postgresql) is the setup reference. Prisma 8 is currently a release candidate. Run Prisma commands from apps/api, or use the workspace script below from the repository root.

- apps/api/prisma.config.ts configures the CLI and loads the API .env through dotenv.
- apps/api/src/prisma/contract.prisma defines City with a UUID string id and required Arabic/English names (nameAr and nameEn). The starter User/Post examples were removed. The owner initialized the City table with prisma db init; the migrations directory contains its db reference and contract snapshot.
- apps/api/src/prisma/db.ts loads the API .env, validates settings through parseEnv, and requires DATABASE_URL when the database module is imported. Catalog and Trip services load this module only when a request needs the database. Health requests and the default automated suite remain independent of PostgreSQL.
- apps/api/.env.example includes the API settings and a placeholder database URL. The local API .env uses the credentials from the root Docker .env. Replace the URL with your own credentials on another machine; URL-encode passwords. Both .env files stay ignored by Git.
- contract.json and contract.d.ts are generated artifacts and must be committed with contract.prisma, as required by the Prisma 8 guide. ESLint and Prettier skip these two artifacts; TypeScript still checks imported types. .gitattributes marks them as generated in GitHub diffs.
- prisma-8.md is the reference written by the initializer. It is not another project plan.

After changing the contract, regenerate its artifacts from the repository root:

```sh
npm run contract:emit
```

The initializer's module: preserve, moduleResolution: bundler, and resolveJsonModule settings are retained. tsx is installed for the guide's scripts; the existing Node development server and tsc build commands remain available. Node 24.11 or newer is required by this project's Prisma setup.

Setup verification does not create tables. The City table has been initialized. The baseline migration recreates City in a fresh database. The contract, baseline, reference, snapshots, example script, and complete City CRUD belong to the same backend feature.

## Run the City learning example

With local PostgreSQL running and the City table initialized, run from the repository root:

```sh
npm run city:example
```

This runs apps/api/src/scripts/city-example.ts with tsx from the API workspace, so dotenv reads apps/api/.env. The script looks for Cairo by both names, creates it without specifying an id when absent, reads all cities, and closes the connection in finally. Prisma generates the UUID. Running it sequentially again reuses the matching row. This is a local learning example, not a concurrency-safe seed or an HTTP endpoint; the name fields have no uniqueness constraint yet.

Keep migrations/app/refs/db.json and migrations/snapshots in Git with the contract. The snapshots are generated and excluded from formatting. No migration plan or additional database schema change is applied by this script. It writes the sample row to the configured database.

## City API

Start PostgreSQL, set apps/api/.env from the safe example using your local credentials, then run these commands from the repository root:

```sh
npm run db:migrate
npm run dev
```

The migration command applies pending changes and updates the development db reference. The committed baseline creates City on a fresh database; an already initialized City database needs no duplicate table. The health endpoint checks liveness only.

| Method | Path                             | Behavior                                             |
| ------ | -------------------------------- | ---------------------------------------------------- |
| GET    | /api/v1/cities?limit=20&offset=0 | Return a page sorted by English name and UUID        |
| GET    | /api/v1/cities/:id               | Return one city or CITY_NOT_FOUND                    |
| POST   | /api/v1/cities                   | Create a city and return 201 with a Location header  |
| PATCH  | /api/v1/cities/:id               | Update one or both names and return the updated city |
| DELETE | /api/v1/cities/:id               | Delete a city and return an empty 204 response       |

Example PowerShell request after signing in as ADMIN or SUPER_ADMIN (set $accessToken from data.accessToken in the login response):

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:4000/api/v1/cities -Headers @{ Authorization = "Bearer $accessToken" } -ContentType application/json -Body (@{ nameAr = 'القاهرة'; nameEn = 'Cairo' } | ConvertTo-Json)
```

POST accepts only nameAr/nameEn, trims whitespace, and requires 1-100 characters for each. The server generates the UUID; caller-supplied ids and unknown fields are rejected. City names are not unique yet. Writes require an authenticated ADMIN or SUPER_ADMIN; city lookups remain public. See the authorization matrix below.

List responses contain data and pagination (limit and offset). Limits range from 1 to 100, offsets from 0 to 100000. Invalid inputs return 400, non-JSON create requests return 415, and unexpected database failures return the existing generic 500 response without private details.

City follows a simple layered structure: routes/cityRoutes.ts maps endpoints, controllers/cityController.ts validates HTTP inputs and sends responses, services/cityService.ts returns plain data using Prisma, and schemas/citySchema.ts defines validation. There is no separate repository layer. createApp accepts optional cities/stations/buses/routes/trips service overrides for isolated HTTP tests. Express 5 forwards rejected route promises to the centralized error handler.

```sh
npm test
npm run test:db
```

The default suite uses in-memory City/Station services and needs no database. test:db is an opt-in real PostgreSQL test: it creates a uniquely named temporary city through HTTP, checks persistence/list/detail, and deletes only its own row afterward. Run it against a development database after applying migrations.

Verification also recreated City from the baseline in a new temporary database, reran migrations, exercised real HTTP operations there, and removed that temporary database. No existing development data was removed.

## Backend structure

Use familiar layer-based folders and camelCase file names. app.ts configures Express; server.ts starts listening. routes map URLs to controllers. controllers handle request/response and validation using schemas. services accept ordinary data, apply business rules when needed, and use Prisma directly. middlewares contains the shared error handler; errors contains AppError. config holds validated environment settings, prisma holds the contract and client, and scripts holds standalone learning/development commands.

Keep the flow Route -> Controller -> Service -> Prisma. Do not add repository, base-class, or dependency-container layers unless a concrete requirement warrants them. Express Request/Response objects stay out of services. Prisma-generated contract and migration artifacts keep their tool-defined names.

City updates use PATCH with at least one of nameAr/nameEn. The same trimmed 1-100 character rules apply; empty updates, unknown fields, and id changes are rejected. Omitted names stay unchanged. PATCH/DELETE validate UUIDs and return CITY_NOT_FOUND when the record is absent. The real PostgreSQL test exercises create/list/detail/update/delete and cleans up its uniquely named row.

Work order: complete, test, document, commit, and push each backend feature before beginning the next. After all agreed backend features are complete, implement the passenger website, then the administration dashboard. Production publication and real-money operations still need explicit approval.

## Station API

Apply the committed migrations with npm run db:migrate before using these endpoints. Station has a generated UUID id, required bilingual names, and a required cityId. A City can have multiple stations. The database enforces the City foreign key with ON DELETE/UPDATE RESTRICT and indexes cityId. City names and station names are not unique at this stage.

| Method | Path                                                | Behavior                                                         |
| ------ | --------------------------------------------------- | ---------------------------------------------------------------- |
| GET    | /api/v1/stations?cityId=CITY_UUID&limit=20&offset=0 | List stations, optionally filtered by city                       |
| GET    | /api/v1/stations/:id                                | Read a station or return STATION_NOT_FOUND                       |
| POST   | /api/v1/stations                                    | Create a station using nameAr, nameEn, and cityId                |
| PATCH  | /api/v1/stations/:id                                | Update one or more names or move the station to an existing city |
| DELETE | /api/v1/stations/:id                                | Delete a station and return an empty 204 response                |

POST/PATCH require application/json and reject unknown fields. Names are trimmed and must contain 1-100 characters; ids must be UUIDs. PATCH needs at least one field and preserves omitted values. List defaults to limit=20/offset=0, allows limit 1-100/offset 0-100000, and sorts by English name then id. A city filter with no matching stations returns an empty list, including a well-formed but absent city id.

Example body (replace CITY_UUID with an id returned by the cities API):

```json
{
  "nameAr": "رمسيس",
  "nameEn": "Ramses",
  "cityId": "CITY_UUID"
}
```

A nonexistent city on create/move returns 404 CITY_NOT_FOUND. A missing station returns 404 STATION_NOT_FOUND. Deleting a city that still has stations returns 409 CITY_HAS_STATIONS; remove or move its stations first. The foreign key enforces these rules atomically, including callers that bypass HTTP validation. Other unexpected failures keep the generic 500 response. These management writes require an authenticated ADMIN or SUPER_ADMIN; station lookups remain public.

The feature follows routes/stationRoutes.ts -> controllers/stationController.ts -> services/stationService.ts -> Prisma. schemas/stationSchema.ts validates Station requests, schemas/paginationSchema.ts shares pagination rules, and utils/databaseErrors.ts identifies PostgreSQL constraint codes without exposing raw error messages. No repository layer is added.

npm run test:db exercises both City and Station CRUD, moving/filtering stations, rejecting orphan writes, and blocking City deletion while stations exist. It creates uniquely scoped data and removes only its own rows. Both migrations and these tests also passed in a fresh temporary database; the existing local Cairo record was preserved. No demo station is added automatically.

## Bus and numbered-seat API

Apply npm run db:migrate before using this feature. Bus stores id (UUID), plateNumber (unique text), seatCount (integer 1-100), and isActive (boolean, default true). BusSeat stores its own UUID, busId, and number. Plate input is trimmed, internal whitespace collapsed, and letters uppercased before persistence. Optional busTypeId and many-to-many amenities are implemented below; optional seatLayout selects a fixed template, as described below.

| Method | Path                                          | Behavior                                                |
| ------ | --------------------------------------------- | ------------------------------------------------------- |
| GET    | /api/v1/buses?isActive=true&limit=20&offset=0 | List buses with optional active/inactive filtering      |
| GET    | /api/v1/buses/:id                             | Read one bus or return BUS_NOT_FOUND                    |
| GET    | /api/v1/buses/:id/seats                       | Read its numbered seats in ascending order              |
| POST   | /api/v1/buses                                 | Create the bus and seats 1 through seatCount atomically |
| PATCH  | /api/v1/buses/:id                             | Edit the plate, capacity, or active status              |
| DELETE | /api/v1/buses/:id                             | Delete the bus and its owned seats; return 204          |

Example create body:

```json
{ "plateNumber": "ABC 123", "seatCount": 40, "isActive": true }
```

POST/PATCH require JSON and reject unknown fields and caller-supplied ids. Plates must contain 1-32 characters after trimming. seatCount must be a number, not a numeric string. PATCH requires at least one supported field; omitted isActive never defaults back to true. List pagination uses the shared limits and sorts by normalized plate and UUID. isActive accepts only the strings true/false in a query.

Creation uses one Prisma transaction for the bus and all seats. Capacity edits lock the bus row, preserve retained seat ids, append new numbers when growing, and remove only numbers above the new capacity when shrinking. The count update and seat changes commit together; a plate conflict rolls back every change. Concurrent capacity updates serialize on that row. Plates and (busId, number) are unique in PostgreSQL. Database checks enforce capacity and seat-number bounds, while the API transaction maintains the exact 1..seatCount set.

The BusSeat foreign key cascades on Bus deletion, so no owned seats are left orphaned. Plate collisions return 409 PLATE_NUMBER_EXISTS. Absent buses return 404 BUS_NOT_FOUND. The write service also maps dependent-record restrictions to 409 BUS_IN_USE as other modules add references. Trip references now protect bus capacity and deletion; reservation-specific safeguards will accompany bookings. Seat catalog numbers describe the vehicle; availability for a particular departure will belong to Trip/Booking.

Implementation follows routes/busRoutes.ts -> controllers/busController.ts -> services/busService.ts, with schemas/busSchema.ts for validation. No repository layer or extra runtime package is introduced. Every Bus endpoint requires an authenticated ADMIN or SUPER_ADMIN, including reads of plates and fleet status.

The real PostgreSQL test covers seat UUIDs, the 100-seat boundary, normalized duplicate plates, growing/shrinking, retained ids, rollback after a conflicting combined edit, concurrent creates/capacity edits, database uniqueness/foreign-key/check constraints, and cascading deletion. Test-created buses and seats are cleaned up. The default HTTP suite still runs without PostgreSQL.

## Route API

Run npm run db:migrate before using this feature. Route represents one direction between two existing stations. It stores id (generated UUID), originStationId, destinationStationId, estimatedDurationMinutes, and isActive (default true). The reverse direction is a separate route. Different stations within one city are permitted. This model does not yet schedule departures or assign a bus or price; those belong to Trip.

| Method | Path               | Behavior                                                                             |
| ------ | ------------------ | ------------------------------------------------------------------------------------ |
| GET    | /api/v1/routes     | List routes with optional originStationId, destinationStationId and isActive filters |
| GET    | /api/v1/routes/:id | Read a route or return ROUTE_NOT_FOUND                                               |
| POST   | /api/v1/routes     | Create a directed route; return 201 and Location                                     |
| PATCH  | /api/v1/routes/:id | Update endpoints, estimated duration or active status                                |
| DELETE | /api/v1/routes/:id | Delete the route; return an empty 204                                                |

Example create body (use UUIDs returned by the Station API):

```json
{
  "originStationId": "ORIGIN_STATION_UUID",
  "destinationStationId": "DESTINATION_STATION_UUID",
  "estimatedDurationMinutes": 180,
  "isActive": true
}
```

POST/PATCH require application/json and reject unknown fields and caller-supplied ids. Estimated duration is a number containing whole minutes from 1 to 10080 (a seven-day application limit); it is an estimate, not a trip's actual arrival time. Endpoints must be distinct valid UUIDs. PATCH requires at least one field and preserves omitted values, including isActive. To disable a route, PATCH isActive to false. Deactivation is a catalog flag at this stage; future Trip rules will enforce scheduling behavior.

List filters can be combined, with isActive accepting only true/false strings. Pagination defaults to limit=20/offset=0, bounds limit to 1-100 and offset to 0-100000, and sorts by UUID. A valid filter without matches returns an empty data array. Responses expose endpoint ids; station names are available through the Station API.

The database enforces directed uniqueness, distinct endpoints, duration bounds, and station foreign keys. Duplicate directions return 409 ROUTE_EXISTS, including concurrent creates and conflicting edits. Missing endpoint stations return 404 STATION_NOT_FOUND. Missing routes return 404 ROUTE_NOT_FOUND. Invalid requests, including a partial update that makes an endpoint equal its stored counterpart, return 400 VALIDATION_ERROR. Failed edits leave the existing row unchanged. Unexpected errors keep the generic safe 500 response.

Deleting either station used by a route returns 409 STATION_HAS_ROUTES; delete its routes first. ON DELETE/UPDATE RESTRICT also protects writes that bypass HTTP. Route deletion maps dependent-record restrictions to 409 ROUTE_IN_USE when later modules add references. Every Route management endpoint requires an authenticated ADMIN or SUPER_ADMIN.

The implementation follows routes/routeRoutes.ts -> controllers/routeController.ts -> services/routeService.ts -> Prisma, with schemas/routeSchema.ts for validation. Single-row writes rely on database constraints atomically rather than a separate read-before-write check. No extra runtime dependencies or architectural layers are introduced.

npm test includes HTTP validation, responses, filters, partial updates and safe errors without requiring PostgreSQL. npm run test:db also verifies persistence, reverse directions, combined filtering/pagination, concurrent duplicate creation, failed-edit rollback, duration bounds, orphan rejection and station deletion restrictions in PostgreSQL. Tests remove only their own scoped rows.

Verification also applied all four migrations to a fresh temporary PostgreSQL database, reran them without changes, ran all four integration tests, exercised the compiled API route list, verified test cleanup, and removed that temporary database. Existing development data was preserved.

## Trip management API

Apply npm run db:migrate before using this feature. Trip joins an existing Route and Bus with departureAt, arrivalAt, pricePiastres, and status. Status is SCHEDULED by default or CANCELLED. The management list includes both statuses and past departures unless filtered. Passenger search is available below; passenger detail and seat endpoints are available below.

| Method | Path              | Behavior                                                     |
| ------ | ----------------- | ------------------------------------------------------------ |
| GET    | /api/v1/trips     | List trips, optionally filtered by routeId, busId and status |
| GET    | /api/v1/trips/:id | Read one trip or return TRIP_NOT_FOUND                       |
| POST   | /api/v1/trips     | Create a future trip; return 201 and Location                |
| PATCH  | /api/v1/trips/:id | Edit references, times, price or status before departure     |
| DELETE | /api/v1/trips/:id | Delete an unreferenced trip; return an empty 204             |

Example create body (replace the route and bus placeholders with real UUIDs, and choose future dates):

```json
{
  "routeId": "ROUTE_UUID",
  "busId": "BUS_UUID",
  "departureAt": "2099-01-01T10:00:00+02:00",
  "arrivalAt": "2099-01-01T13:00:00+02:00",
  "pricePiastres": 25000
}
```

25000 piastres means EGP 250.00. Prices are integer numbers from 0 to 2147483647; fractional prices and numeric strings are rejected. Arrival must be strictly after departure. Timestamps must be valid ISO date-times with Z or an explicit UTC offset and at most three fractional-second digits. The API normalizes responses to UTC millisecond ISO strings: the example departure becomes 2099-01-01T08:00:00.000Z. Use the actual offset for the travel date; +02:00 is not an assumption for every Cairo date.

The contract uses TimestamptzString: PostgreSQL stores timezone-aware timestamptz values while TypeScript receives strings. This avoids adding Temporal setup on Node 24; the API normalizes those strings at its service boundary. See the official [Prisma 8 date/time types](https://www.prisma.io/docs/orm/contract-authoring/psl-syntax#models-and-fields). No new runtime package is needed.

POST/PATCH require application/json, reject unknown fields and caller ids, and validate UUIDs. PATCH requires at least one supported field and preserves omitted values, including cancellation. Scheduling requires an active route and bus. Missing parents return 404 ROUTE_NOT_FOUND or BUS_NOT_FOUND; inactive parents return 409 ROUTE_INACTIVE or BUS_INACTIVE. Deactivating a catalog record leaves existing trips unchanged, but prevents scheduling/reinstating trips on it. Cancellation remains allowed before departure even with inactive parents.

Create requires a future departure, including when creating a cancelled record. Editing an already departed trip returns 409 TRIP_DEPARTED. Partial time edits are validated against the stored opposite timestamp. For an unbooked future trip, PATCH status=CANCELLED cancels it and PATCH status=SCHEDULED reinstates it after scheduling checks. A trip with reservations rejects actual edits, including status changes, with 409 TRIP_HAS_BOOKINGS. Operator cancellation with affected reservations, refunds and notifications is deferred until its policy and workflow are implemented.

Trip writes run in a transaction. PATCH locks the trip before reading its current fields. Both create and update lock the route for sharing, then lock the target bus for update before checking overlap. A scheduled trip conflicts when another scheduled trip on the same bus departs before its arrival and arrives after its departure. Conflicts return 409 BUS_SCHEDULE_CONFLICT, including concurrent creates and edits. Cancelled trips do not occupy the bus. Back-to-back trips are allowed: no turnaround buffer or vehicle-location feasibility rule is assumed at this stage. Failed edits roll back without changing stored values. This overlap guarantee belongs to the service transaction; direct database writes must use the same scheduling protocol.

Database constraints separately enforce arrival after departure, nonnegative bounded prices, valid statuses and restrictive route/bus foreign keys. Deleting a referenced Bus or Route returns 409 BUS_IN_USE or ROUTE_IN_USE. A bus used by any trip, including a cancelled or past trip, cannot change seatCount (409 BUS_HAS_TRIPS). A route used by any trip cannot change endpoints (409 ROUTE_HAS_TRIPS). Create a different catalog record when needed; unchanged endpoint values, route duration, plates and active flags remain editable. Parent-row locks coordinate these checks with concurrent trip creation. Deleting all dependent trips releases these restrictions.

DELETE currently removes an unreferenced trip, including historical trips. The service maps dependent-record restrictions to 409 TRIP_IN_USE when bookings are introduced. Reservations now prevent trip deletion through a restrictive foreign key and block actual changes to booked trips with 409 TRIP_HAS_BOOKINGS. These management endpoints require an authenticated ADMIN or SUPER_ADMIN. Passenger search, details and departure seats remain public.

Lists accept combined routeId/busId UUID filters and status=SCHEDULED/CANCELLED, with limit=20 and offset=0 by default (limits 1-100, offsets 0-100000). Results sort by departure instant then UUID. Missing filter matches return an empty list. Invalid requests return 400 VALIDATION_ERROR, non-JSON bodies return 415, missing trips return 404 TRIP_NOT_FOUND, and unexpected failures keep the generic safe 500 response.

Implementation follows routes/tripRoutes.ts -> controllers/tripController.ts -> services/tripService.ts -> Prisma, with schemas/tripSchema.ts for HTTP validation. The HTTP suite checks timezone normalization, prices, statuses, filters, partial edits, missing records and safe errors without PostgreSQL. The PostgreSQL integration suite verifies CRUD persistence, back-to-back and different-bus scheduling, simultaneous conflicting creates/edits, cancellation/reinstatement checks, inactive/missing parents, rollback, catalog edit/delete guards and direct database constraints. Test-created rows are cleaned up.

Trip verification applied all five migrations to a fresh temporary database, confirmed that a second migration run applied nothing, passed all five integration tests there, and exercised compiled JavaScript Trip creation/listing with timezone normalization. The temporary database was removed. The complete default HTTP suite has 70 passing tests; type checking, lint, formatting and build pass.

## Demo seed data

From the repository root, with local PostgreSQL running and apps/api/.env configured:

```sh
npm run db:migrate
npm run db:seed
npm run dev
```

The seed command creates a separate demo catalog with 3 cities (Cairo, Alexandria, Hurghada), 3 stations, 3 directed routes, 3 buses, 60 seats and 9 scheduled trips. Each route has one 09:00 Cairo departure on each of the next three calendar days. Cairo/Alexandria trips cost 25000 piastres; Cairo/Hurghada costs 50000. Output contains actual UUIDs and travel dates for copying into requests. Existing user-created cities, including the learning Cairo row, are preserved; matching city names are not merged because names are not unique.

Fixture ids and demo plates are stable. Repeated runs for the same dates preserve matching records and do not create duplicates. A later-day run adds only missing departures for its new three-day window; it never deletes older trips. If an operator edited a demo record, including cancelling a departure, the command fails and rolls back instead of resetting it. It does not delete or overwrite ordinary records. Resolve conflicts manually or use a separate development database; there is no destructive reset command.

All seed writes share a transaction. Concurrent seed commands serialize on a PostgreSQL advisory lock. New departures also lock their route/bus, recheck their data, and reject an existing overlapping schedule. Demo seeding is disabled when NODE_ENV=production. Keep NODE_ENV appropriate for the database you configured; never use production credentials for local demo data. Errors avoid printing connection secrets. db:seed uses the API workspace's environment and closes its connection.

Implementation: scripts/demoData.ts describes the fixtures and stable ids, scripts/demoSeed.ts inserts/checks them, and scripts/seed.ts is the command entry point. Tests use a separate random fixture namespace to avoid touching normal demo data.

## Passenger trip search

```text
GET /api/v1/trips/search?originCityId=CAIRO_UUID&destinationCityId=ALEX_UUID&travelDate=YYYY-MM-DD
```

Replace placeholders with UUIDs and a date printed by npm run db:seed. Choose exactly one originCityId or originStationId, and exactly one destinationCityId or destinationStationId. City-to-city, station-to-station and mixed searches are supported. Identical station endpoints, ambiguous city+station choices on one side, invalid/repeated/unknown parameters and invalid dates return 400 VALIDATION_ERROR. Same-city searches are allowed between distinct stations. A well-formed endpoint with no matching departure returns an empty data array.

travelDate is a valid YYYY-MM-DD calendar date from 2000 through 9998, interpreted in Africa/Cairo. The service converts the start of that day and the next day to UTC instants, then includes departureAt >= start and departureAt < end. It separately requires departureAt > the current instant, status=SCHEDULED, and active route/bus records. Past dates return an empty list. Arrival may be on a different date. A fixed +02:00/+03:00 offset or adding 24 hours would fail around DST; utils/cairoTime.ts uses temporal-polyfill with named timezone rules instead. The polyfill is now a direct API dependency, imported locally without modifying global Temporal or changing Prisma's timestamp codecs.

Results sort by departure instant then UUID. limit defaults to 20 (1-100), offset to 0 (0-100000). Pagination is applied in the database. Each result includes Trip fields with UTC ISO timestamps, bus id/seatCount, bilingual busType and amenities (not its plate), and the route with origin/destination stations and their cities, including Arabic/English names. Relations are included in the database query rather than loaded in a per-trip loop. SeatCount is vehicle capacity; it is not a count of remaining available seats. Current departure seat availability is exposed by the endpoint below using per-trip reservations.

Response shape:

```json
{
  "data": [],
  "pagination": { "limit": 20, "offset": 0 },
  "search": { "travelDate": "2099-01-01", "timeZone": "Africa/Cairo" }
}
```

The /search route is registered before /:id. Management GET /api/v1/trips retains its existing behavior. Passenger search is read-only; it does not create a reservation. Implementation follows routes/tripRoutes.ts -> controllers/tripSearchController.ts -> services/tripSearchService.ts, with schemas/tripSearchSchema.ts for strict query validation.

Verification covers HTTP input errors and safe responses, normal/23-hour/25-hour Cairo date boundaries, real PostgreSQL endpoint filtering, bilingual relation data, active/cancelled/past exclusions, precise inclusive/exclusive date bounds and pagination, concurrent repeatable seeds, preservation of edited demo records, and production seed refusal. Tests remove only their own randomly scoped fixtures.

The fresh-database verification applied the existing five migrations, passed all six PostgreSQL tests, ran the compiled seed command twice, checked 3 cities/3 buses/60 seats/9 trips, and exercised compiled passenger search. The temporary database was removed. Local demo seeding also ran twice successfully and preserved the pre-existing learning city. No schema change or new migration was required for this feature.

## Passenger trip details and seats

After searching, use a returned Trip id:

| Method | Path                      | Behavior                                                                           |
| ------ | ------------------------- | ---------------------------------------------------------------------------------- |
| GET    | /api/v1/trips/:id/details | Passenger trip, price, UTC times, bus capacity, and bilingual station/city details |
| GET    | /api/v1/trips/:id/seats   | Current bus seat ids/numbers and per-departure availability response               |

These read-only endpoints require a valid UUID and accept no query parameters. They expose only future SCHEDULED trips with an active Route and Bus, matching passenger search. Missing, cancelled, departed, inactive-route and inactive-bus trips all return 404 TRIP_NOT_FOUND. Invalid ids or unsupported query parameters return 400 VALIDATION_ERROR. Unexpected failures return the existing safe 500 JSON response. Both successful and error responses set Cache-Control: no-store so a client must fetch current state.

Details return the same enriched Trip shape as search, wrapped in data. The bus includes id, seatCount, bilingual busType (or null) and amenities; its plate and internal linking rows are not exposed. Route endpoints include station and city names in Arabic and English. Timestamps are normalized to UTC ISO strings and prices remain integer piastres. Existing management GET /api/v1/trips/:id still returns its scalar record, including past/cancelled trips, for the later operator interface.

Example seat response for a two-seat bus:

```json
{
  "data": {
    "tripId": "TRIP_UUID",
    "busId": "BUS_UUID",
    "seatLayout": null,
    "totalSeats": 2,
    "availableSeats": 2,
    "seats": [
      { "id": "SEAT_1_UUID", "number": 1, "isAvailable": true },
      { "id": "SEAT_2_UUID", "number": 2, "isAvailable": true }
    ]
  }
}
```

Seats are sorted numerically. Each seat id belongs to BusSeat and stays the same across different trips on that bus. A booking identifies the trip and seat together. An unbooked trip may be assigned another bus; a trip with reservations cannot change its assigned bus. totalSeats counts the returned catalog seats; availableSeats counts seats marked available.

Availability now excludes BookingSeat allocations for the requested trip. The same bus seat can remain available on another departure. This read does not reserve or hold a seat and cannot promise availability for a later write; reservation creation rechecks availability transactionally. Public seat responses expose no passenger names, phone numbers or booking identifiers.

Implementation follows routes/tripRoutes.ts -> controllers/tripDetailsController.ts -> services/tripDetailsService.ts. The existing trip schema supplies UUID and strict empty-query validation. The service shares one eligibility query builder between details and seats. Each endpoint loads related data in one database query; seats and the trip's current bus/eligibility are read in the same snapshot. Services still load Prisma lazily, so default HTTP tests need no database.

Verification covers responses, validation, missing/error behavior and no-store headers in HTTP tests, plus PostgreSQL-backed bilingual details, chronological visibility, cancelled/inactive exclusions, ordered seat ids/counts, repeated reads without mutations, separate departures on the same bus, bus reassignment, preservation of management reads and scoped cleanup. All 82 default tests and 7 PostgreSQL integration tests pass, along with type checking, lint, formatting and build. No migration is required.

Compiled JavaScript verification also read a real seeded trip through both new endpoints, checked bilingual details, absence of vehicle plates, numeric seat ordering and capacity/availability counts, and left existing demo data unchanged.

## Registration and email verification

Registration creates and verifies accounts; sign-in and sessions are implemented below. Catalog management is now protected by the roles documented below. The current API and Mailpit remain local development services.

From the repository root:

```sh
docker compose up -d --wait postgres mailpit
npm run db:migrate
npm run dev
```

In another terminal, keep the mail worker running:

```sh
npm run email:worker
```

Open http://127.0.0.1:8025 to view captured emails. Mailpit receives local SMTP on 127.0.0.1:1025 and does not deliver these messages to real inboxes. Both ports bind only to loopback. No Mailpit volume is configured; recreating its container can remove captured test messages. The worker polls every two seconds, up to twenty messages per batch. npm run email:flush processes one batch and exits, useful for manual testing. Stop the worker with Ctrl+C.

apps/api/.env needs AUTH_CODE_SECRET: a stable random 32-byte key encoded as 64 hexadecimal characters. A local value was generated without printing it. On a fresh checkout, replace the safe placeholder in .env.example using a locally generated key:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Never commit the real key. Keep it with the database's development secrets; rotating it invalidates pending verification hashes and encrypted outbox payloads, requiring a resend. parseAuthEnv in config/env.ts validates the key and SMTP settings when authentication or the worker needs them; parseEnv continues validating base API/database settings. Health and isolated HTTP tests do not need authentication secrets or SMTP.

| Setting                   | Local default / requirement         |
| ------------------------- | ----------------------------------- |
| AUTH_CODE_SECRET          | Required 64 hex characters          |
| SMTP_HOST                 | 127.0.0.1                           |
| SMTP_PORT                 | 1025                                |
| SMTP_SECURE               | false; accepts true/false           |
| SMTP_FROM                 | noreply@bus.local                   |
| SMTP_USER / SMTP_PASSWORD | Optional; must be supplied together |

The SMTP defaults target Mailpit. A future external SMTP deployment requires its own verified configuration; production publication is not part of this step.

| Method | Path                             | Behavior                                               |
| ------ | -------------------------------- | ------------------------------------------------------ |
| POST   | /api/v1/auth/register            | Validate registration; return a generic 202            |
| POST   | /api/v1/auth/verify-email        | Consume a valid six-digit code; return 200             |
| POST   | /api/v1/auth/resend-verification | Queue a replacement when allowed; return a generic 202 |

Register body:

```json
{
  "name": "Mahmoud",
  "email": "mahmoud@example.test",
  "phone": "+201012345678",
  "password": "Use-your-own-long-password",
  "language": "ar"
}
```

Names are trimmed and contain 1-100 characters. Emails are trimmed/lowercased and limited to 254 characters. Phone numbers use international +country-code format with 8-15 digits, without spaces; phone uniqueness is not assumed. Passwords contain 12-128 characters, at most 512 UTF-8 bytes, and are not trimmed. language is ar (default) or en. Unknown fields, including caller ids/roles, are rejected. JSON is required and query parameters are unsupported. Register returns a generic message plus a random verificationId receipt, without user ids, password hashes or codes. A new registration receives its real verification id; duplicate emails receive an indistinguishable decoy id, preserve existing credentials and do not queue email. Keep the original receipt for verification/resend; a duplicate registration must not activate an account created by another client.

Read the code from Mailpit, then verify:

```json
{
  "email": "mahmoud@example.test",
  "verificationId": "UUID_FROM_REGISTER_RESPONSE",
  "code": "012345"
}
```

Send that body to POST /api/v1/auth/verify-email. Codes must be strings so leading zeroes are preserved. Successful verification sets User.emailVerifiedAt and deletes the verification/outbox records atomically. A code can succeed only once, including simultaneous submissions. Unknown accounts, incorrect registration receipts, already verified accounts, incorrect codes, expired codes and exhausted attempts return the same 400 INVALID_VERIFICATION_CODE. Invalid body shape returns 400 VALIDATION_ERROR; non-JSON returns 415; unexpected failures use the safe generic 500 handler. Auth responses disable caching.

Codes use a cryptographically random six-digit value, expire ten minutes after being queued, and allow five wrong submissions per code. Failed attempts commit before returning an error. POST /resend-verification requires email and the original verificationId. It waits at least sixty seconds between codes and allows five code issuances (including registration) per account in a one-hour window anchored at the first issuance. Resending invalidates the preceding code and replaces pending email records; it never restores a cancelled/used code. Cooldown, limit, unknown and verified-account cases all return the same 202 without indicating whether email was queued.

Per-IP limits use express-rate-limit: 10 registration requests/hour, 30 verification requests/15 minutes, and 20 resend requests/hour. Limits apply after JSON parsing and count invalid fields and unsuccessful requests too, return safe 429 RATE_LIMITED JSON and Retry-After, and use process-local memory. Durable code/resend limits live in PostgreSQL. A shared IP limiter and deployment-specific trusted proxy configuration are required before multiple API instances or public deployment; Redis is deferred. Express currently trusts no forwarding proxy headers.

Passwords are Argon2id PHC hashes with random library-generated salts, memoryCost=65536 KiB, timeCost=3 and parallelism=1. Verification records contain an HMAC-SHA256 digest bound to user id and AUTH_CODE_SECRET, compared with timingSafeEqual. The outbox must recover the code to send it, so its temporary code payload uses AES-256-GCM with a separately derived key and user-bound authenticated data. It clears that payload after delivery or discard. Plaintext codes/passwords are not stored or returned by the API. These choices follow [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) and [single-use token guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

User, EmailVerification and EmailOutbox are committed in one transaction. Per-email advisory locks serialize register/resend/verify; unique normalized emails and verification user ids are also database constraints. The outbox worker locks and rereads each message before sending, checks that the code is current/unexpired and the user remains unverified, and serializes concurrent workers. It retries SMTP failures after 30/60/120/240 seconds, abandons after five delivery attempts or expiry, and never logs codes, credentials or raw transport errors. Retries retain the same Message-ID. Delivery is at least once: a process crash after SMTP acceptance but before the database commit may deliver the same code twice; verification still succeeds only once. Sent/failed records remain until verification, resend or later cleanup. Cleanup of stale accounts/codes is a later maintenance task.

Implementation follows routes/authRoutes.ts -> controllers/authController.ts -> services/authService.ts -> Prisma, with schemas/authSchema.ts and utils/authCrypto.ts. emails/verificationEmail.ts holds Arabic RTL and English templates. services/mailService.ts wraps Nodemailer SMTP; services/emailOutboxService.ts handles delivery/retries, and workers/emailWorker.ts runs it. No repository layer or queue framework was added.

Tests cover normalization/validation, Argon2 verification, encryption binding/tamper detection, templates, safe errors and IP throttling; PostgreSQL tests cover duplicate/concurrent registration, atomic code consumption, concurrent failed-attempt limits, cooldown/hourly resend limits, expired codes, concurrent workers, delayed retries, exhaustion and scoped cleanup. SMTP delivery and verification are also exercised through local Mailpit using the compiled API. Existing trip demo data is preserved.

Fresh-database verification applied all six migrations, confirmed the second run applied none, and passed all eight PostgreSQL integration tests. The compiled API registered a scoped test account, delivered its Arabic message through real SMTP to local Mailpit, consumed the emailed code, and ran the compiled worker once. Test users and the temporary database were removed; existing cities and demo trips were preserved.

## Sign-in and sessions

Apply npm run db:migrate. A separate AUTH_ACCESS_SECRET in apps/api/.env signs access tokens: generate another independent 32-byte random hex value using the command shown above. Local configuration has already been generated without displaying secrets. parseSessionEnv validates this signing key; it is separate from the verification/outbox encryption key. Changing it invalidates existing access tokens; refresh sessions remain controlled by the database. There is no default signing secret.

Before sign-in, registration clients must retain the verificationId returned by their original POST /register and supply it with both email verification and resend requests. The id is not emailed. It stays stable when resending. Wrong receipts cannot confirm the account or request new codes. Re-registering the same email returns a new decoy receipt and never transfers ownership of the pending credentials. Existing unverified registrations from before this API change, or clients that lose the original receipt, cannot complete activation through duplicate registration; they can use the password recovery flow below to prove mailbox ownership and set a new password. This is an intentional change before building frontend clients.

| Method | Path                    | Behavior                                                                             |
| ------ | ----------------------- | ------------------------------------------------------------------------------------ |
| POST   | /api/v1/auth/login      | Verified, active account signs in; sets refresh cookie and returns access token/user |
| POST   | /api/v1/auth/refresh    | Consumes refresh cookie and sets its replacement                                     |
| GET    | /api/v1/auth/me         | Returns the current user using Bearer access authentication                          |
| POST   | /api/v1/auth/logout     | Revokes the refresh cookie's session, clears cookie, returns 204                     |
| POST   | /api/v1/auth/logout-all | Revokes every session for the authenticated user and returns 204                     |

All session POST requests require Content-Type: application/json and X-CSRF-Protection: 1. Login body contains only email/password with the registration email/password validation rules. Refresh/logout/logout-all accept an empty object (or empty JSON body); tokens must not be supplied in their body or query. me/logout-all require Authorization: Bearer ACCESS_TOKEN. All responses disable caching.

Login response:

```json
{
  "data": {
    "accessToken": "JWT_ACCESS_TOKEN",
    "expiresIn": 900,
    "user": {
      "id": "USER_UUID",
      "name": "Mahmoud",
      "email": "mahmoud@example.test",
      "phone": "+201012345678",
      "role": "USER",
      "language": "ar",
      "emailVerifiedAt": "2026-10-16T10:00:00.000Z",
      "createdAt": "2026-10-16T09:55:00.000Z"
    }
  }
}
```

Refresh returns the same response shape with a new access token and replacement refresh cookie. The refresh token is never returned in JSON. Do not place access tokens in URLs; a future browser client should hold them in memory. The JWT uses HS256 with fixed issuer/audience/type and validates signature, expiry, required claims and token purpose. Its subject is the user UUID and sid identifies the database session. requireAuth additionally checks that the session is current/unrevoked and the user remains active and email-verified, so logout or suspension blocks already-issued access tokens immediately on subsequent checks.

Refresh tokens are random 32-byte opaque values; only SHA-256 hashes are stored. Each login creates an independent Session (token family). The session and all its refresh tokens have the same thirty-day absolute expiry; refresh does not extend it. Refresh locks the Session, rereads the presented token, marks it used, and inserts a new token atomically. Reusing a consumed token revokes the whole session and returns 401, including tokens issued by a concurrent refresh. Keep refresh calls serialized in clients: two simultaneous refreshes can produce one success followed by replay revocation. Lost refresh responses require signing in again rather than retrying the consumed token.

Local HTTP cookies are named bus_refresh; production uses __Secure-bus_refresh and Secure. Both are HttpOnly, SameSite=Strict, host-only (no Domain), expire at session expiry, and use Path=/api/v1/auth. Logout clears matching attributes. Unknown/missing refresh cookies yield 401 on refresh and idempotent 204 on logout. Refresh auth failures clear the cookie. Logout-all requires a valid Bearer token and revokes all currently existing sessions; a later fresh sign-in can create another session. Expired/revoked session/token records remain for replay detection until later maintenance cleanup.

The custom CSRF header is mandatory even for non-browser clients. If Origin is present it must exactly match the configured CORS allowlist; missing Origin is allowed for CLI clients that send the custom header. Browser requests with a custom header require a successful preflight, and CORS enables credentials only alongside explicit allowed origins. No wildcard or trusted forwarded-host inference is used. A browser client must use credentials: include for login/refresh/logout. SameSite=Strict requires same-site web/API hostnames: use localhost for both (or configure 127.0.0.1 consistently), not a mixture. Separate ports are supported; a cross-site production arrangement is outside this local setup and needs its own cookie/CSRF design and browser verification.

Invalid credentials, inactive accounts, unverified accounts and locked accounts share 401 INVALID_CREDENTIALS. Unknown users still run Argon2 verification against a fixed public decoy hash. Five wrong passwords lock a known account for fifteen minutes in PostgreSQL; failed attempts commit, successful eligible sign-in resets the counter after the lock expires. Login has a process-local limit of twenty requests per fifteen minutes, refresh/logout sixty, and logout-all twenty. Malformed requests count after JSON parsing. These IP stores are local to one process; shared deployment limiting remains deferred.

Invalid session credentials return 401 UNAUTHENTICATED, CSRF violations return 403 CSRF_REJECTED, and throttling returns 429 RATE_LIMITED with Retry-After. Invalid input and unsupported media types retain the shared 400/415 behavior. Internal errors stay generic. Cookies/tokens/passwords are not logged. Existing catalog writes require ADMIN or SUPER_ADMIN; creating an account grants only USER.

Implementation uses services/sessionService.ts for login/rotation/revocation, utils/sessionTokens.ts for opaque tokens and jose JWT validation/signing, middlewares/requireAuth.ts for protected requests, middlewares/sessionCsrf.ts for mutation checks, and controllers/sessionController.ts/routes/sessionRoutes.ts for HTTP/cookies. cookie-parser only parses the refresh cookie. Services do not use Express objects, and there is no repository layer.

Validation covers signup-receipt ownership, verified-account enforcement, JWT tampering/expiry/audience/purpose, safe cookies, CSRF/origin failures, durable lockout, rotating hashed refresh tokens, replay and concurrent refresh revocation, separate-device logout, logout-all, inactive/expired sessions, safe error output and scoped cleanup. The full suites contain 131 default tests and fourteen PostgreSQL integration tests. Shared rate-limit storage and browser frontend integration remain later feature batches.

Session verification also applied all seven migrations to a fresh temporary database, reran them without changes, passed all nine PostgreSQL integration tests there, and exercised compiled SMTP activation, sign-in, current-user lookup, refresh rotation and logout. The temporary database and scoped test accounts were removed; existing demo trips remain unchanged.

## Password recovery

Apply npm run db:migrate before running the updated API or email worker. This additive migration creates PasswordReset and adds an EmailOutbox purpose; existing messages default to VERIFY_EMAIL. No new package or environment setting is required.

| Method | Path                         | Body                                                                                                                                                 | Result                                        |
| ------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| POST   | /api/v1/auth/forgot-password | { "email": "passenger@example.com" }                                                                                                                 | Generic 202 regardless of account eligibility |
| POST   | /api/v1/auth/reset-password  | { "email": "passenger@example.com", "code": "123456", "newPassword": "Choose-a-new-long-password", "confirmPassword": "Choose-a-new-long-password" } | 200 after a valid single-use code             |

Both endpoints require JSON, reject unknown body/query fields and disable caching. Email normalization and password rules match registration. New/confirm passwords must match. Invalid, expired, exhausted, consumed or suspended-account codes share 400 INVALID_RESET_CODE. These endpoints do not authenticate through a cookie or issue a session, so the session CSRF header is not required.

Recovery codes contain six digits, expire after ten minutes and permit five failed guesses. Requests have a sixty-second cooldown and at most five issuances per account in an anchored one-hour window. Consuming a code preserves that window and quota. A replacement invalidates its predecessor. Unknown/inactive accounts receive the same request response without an email. The request controller pads processing to at least 250 ms to reduce simple timing differences; this is not a constant-time guarantee. Process-local IP limits are ten requests for forgot-password and twenty for reset-password per fifteen minutes, with 429 and Retry-After.

Requesting a code does not change the password or revoke sessions. Successful reset atomically updates the Argon2id hash, consumes the code, resets login lockout, revokes every existing session and queues a password-changed notice. Old access and refresh tokens then fail their session checks. The user must sign in again; no automatic login occurs. A pending registration can recover without its original verification receipt by proving mailbox ownership with the recovery code and setting a new password. This also verifies its email and removes the old activation challenge; it never reactivates a suspended account or replaces profile details.

Password-reset digests and encrypted outbox payloads use a separate purpose-bound context from activation codes. The shared worker distinguishes VERIFY_EMAIL, PASSWORD_RESET and PASSWORD_CHANGED, discards stale/used/exhausted codes and clears code payloads after delivery/discard. The security notice contains no password or code. It retries through the existing transactional outbox and expires after twenty-four hours. Delivery remains at least once. Start npm run email:worker or run npm run email:flush; inspect local SMTP messages at http://127.0.0.1:8025/.

Read schemas/passwordResetSchema.ts for input rules, routes/passwordResetRoutes.ts for endpoints/IP limits, controllers/passwordResetController.ts for HTTP handling, services/passwordResetService.ts for transactions and session revocation, and emails/passwordResetEmail.ts for Arabic/English messages. These paths are under apps/api/src. Tests cover generic replies, validation, purpose isolation, cooldown/quota, expiry, failed guesses, simultaneous requests/resets, pending-account recovery, session revocation, suspension and notification delivery. Each integration test cleans only its own records.

Verification: all eight migrations applied to an empty temporary database; a second migration run applied none. All ten PostgreSQL integration tests passed there. A compiled JavaScript HTTP smoke test used real Nodemailer SMTP delivery to Mailpit for verification, password recovery and the change notice, checked old-session rejection and new-password sign-in, then cleaned its records and dropped only its temporary database. Existing development catalog data remained unchanged.

## Roles and catalog authorization

Apply npm run db:migrate before starting the API. The additive migration adds User.role with a USER default and a PostgreSQL check constraint allowing USER, ADMIN and SUPER_ADMIN. Existing accounts stay USER. Public registration rejects role, isAdmin and other unknown fields. Login, refresh and current-user responses now include role in their safe user object. Access JWTs do not carry authorization roles; requireAuth reads the current user and session from PostgreSQL on every protected request, so demotion takes effect at the next check without waiting for token expiry. Suspension, unverified email and revoked/expired sessions still return 401.

| Endpoints                                                                            | Public access | Required role        |
| ------------------------------------------------------------------------------------ | ------------- | -------------------- |
| GET /api/v1/health                                                                   | Yes           | None                 |
| GET /api/v1/cities and /cities/:id                                                   | Yes           | None                 |
| GET /api/v1/stations and /stations/:id                                               | Yes           | None                 |
| GET /api/v1/trips/search, /trips/:id/details, /trips/:id/seats                       | Yes           | None                 |
| POST/PATCH/DELETE catalog endpoints (cities, stations, buses, routes, trips)         | No            | ADMIN or SUPER_ADMIN |
| All /api/v1/buses, /api/v1/routes, /api/v1/bus-types and /api/v1/amenities endpoints | No            | ADMIN or SUPER_ADMIN |
| GET /api/v1/trips and /trips/:id management endpoints                                | No            | ADMIN or SUPER_ADMIN |

Protected requests require Authorization: Bearer ACCESS_TOKEN. A refresh cookie alone grants no catalog access. No additional session-CSRF header is required for these Bearer-authenticated endpoints. Anonymous/invalid authentication receives 401 UNAUTHENTICATED; an authenticated passenger receives 403 FORBIDDEN. Checks run before controller validation and database mutations, with Cache-Control: no-store on protected responses. HEAD receives the same read authorization. Public CORS preflights remain handled before routers. Route management can expose inactive catalog records, so passengers use the existing filtered search/details endpoints.

The reusable middlewares/requireRole.ts accepts explicit allowed roles: management currently permits ADMIN and SUPER_ADMIN. Administrator management now permits only SUPER_ADMIN through the separate /api/v1/admin/admins routes. Refund authorization will be added with payment/refund work. Reservation endpoints now enforce passenger ownership separately, including for administrator accounts.

### Bootstrap the first super admin

First register an account, receive its local email through Mailpit and verify it. Then run from the repository root, replacing the example with that account's email:

```sh
npm run admin:bootstrap -- --email verified@example.com
```

This local operator command promotes an existing active, verified account; it never creates a password, bypasses email verification or reactivates an account. It takes a database advisory lock so concurrent first-admin commands cannot promote different accounts. If any SUPER_ADMIN already exists, a different target is rejected, including when the existing super admin is suspended. Rerunning it for the same active, verified super admin is a no-op. The initial promotion revokes existing sessions; sign in again to get a fresh session. There is no HTTP bootstrap route, automatic admin seed, default administrator credential or role-setting field in public registration. Run the command only with access to the intended database; it is a privileged operator action. No permanent administrator was created by our tests.

Read src/middlewares/requireAuth.ts, src/middlewares/requireRole.ts and the catalog routers for request enforcement; src/services/sessionService.ts includes the safe role; src/services/adminBootstrapService.ts and src/scripts/bootstrapAdmin.ts implement the operator command. These paths are under apps/api. Catalog tests use an injected test-only session service to focus on catalog behavior; the authorization integration suite uses actual users, Argon2 hashes, JWTs and database sessions to verify role enforcement, live role changes, suspension, logout and safe bootstrap concurrency. Its cleanup removes only its own fixtures.

Authorization verification: all nine migrations applied to a fresh temporary database; rerunning applied zero. All eleven PostgreSQL integration tests passed there, including bootstrap concurrency. A compiled HTTP smoke test exercised the root npm bootstrap command, repeated it idempotently, checked promotion-time session revocation, privileged catalog creation and immediate denial after demotion. The temporary database and test accounts were removed; no permanent administrator was created.

## Reservation MVP (no payment, no passenger cancellation)

Apply npm run db:migrate before starting the updated API. No extra dependency or environment variable is needed. Reservations use only RESERVED status, consume their seats immediately and do not expire automatically. They do not represent a paid ticket. Payment holds, paid confirmation, QR tickets and booking emails are later features. Passenger cancellation is disabled by the owner's decision; no cancellation, DELETE or PATCH booking endpoint exists. Operator cancellation/refund policy remains a separate future decision.

Every booking endpoint requires Authorization: Bearer ACCESS_TOKEN for an active, email-verified account and an unrevoked session. A refresh cookie alone is insufficient. These Bearer-authenticated endpoints need no session-CSRF header. Responses, including errors, disable caching.

| Method | Path                               | Behavior                                                                  |
| ------ | ---------------------------------- | ------------------------------------------------------------------------- |
| POST   | /api/v1/bookings                   | Reserve all selected seats atomically; return 201, reference and Location |
| GET    | /api/v1/bookings?limit=20&offset=0 | List only the current account's reservations, newest first                |
| GET    | /api/v1/bookings/:id               | Return an owned reservation, otherwise 404 BOOKING_NOT_FOUND              |

POST accepts tripId, contactPhone and passengers. Seat positions follow the bus's fixed template; no layoutId is needed. Replace UUID placeholders with a trip and its seat ids from GET /api/v1/trips/:id/seats:

```json
{
  "tripId": "TRIP_UUID",
  "contactPhone": "+201012345678",
  "passengers": [
    { "seatId": "FIRST_SEAT_UUID", "name": "Mahmoud Ahmed" },
    { "seatId": "SECOND_SEAT_UUID", "name": "Sara Ahmed" }
  ]
}
```

Choose 1-100 distinct seats on the assigned bus, within its available capacity. Passenger names are trimmed and contain 1-100 characters. contactPhone uses international +country-code format with 8-15 digits; it is a booking contact, not proof of phone ownership. Caller-supplied user ids, prices, totals, status, references and unknown fields are rejected. User ownership comes from the authenticated session. The server snapshots the trip's unit price and multiplies it by passenger count. Currency is EGP and all amounts are integer piastres. For example, two seats at 25000 piastres produce a total of 50000 piastres (EGP 500.00).

Booking stores the owner, trip, unique random BUS- reference, RESERVED status, contact phone, seat count, unit price, total and creation timestamp. BookingSeat stores each seat id, original seat number and passenger name. totalPiastres uses PostgreSQL bigint because 100 int32-priced seats can exceed int32; bounded totals are safely converted to JSON numbers. Database checks enforce the price multiplication and seat-count bounds. A composite foreign key keeps each allocation on its booking's trip, and UNIQUE(tripId, seatId) prevents two reservations for the same departure/seat even if application checks are bypassed. The same physical seat may be booked on a different departure.

Creation rechecks account/session eligibility inside a transaction, locks User then Session, and locks Trip -> Route -> Bus in the same parent order used by trip management. The trip row serializes reservations and trip edits. It must remain future, SCHEDULED and attached to an active route and bus. Every selected seat must belong to that bus and remain unallocated. Booking and all BookingSeat rows commit together; a conflict or failed passenger insertion rolls back everything. The database uniqueness constraint is the final duplicate-seat guard. One competing request receives 201 and the other receives 409 SEAT_UNAVAILABLE. A request containing one occupied seat reserves none of its remaining seats. This MVP uses a short per-trip transaction; later traffic may justify more granular locking.

Bookings return reference/status, paymentRequired: false, currency, contact phone, server prices, timestamps, bilingual trip route/station/city information and ordered passenger seats. User ids, password data and bus plates are excluded. Listing defaults to twenty rows, accepts limits 1-100 and offsets 0-100000, and rejects other query fields. UUID detail lookups return the same 404 for a missing reservation or another account's reservation, including when the caller is an administrator. Past trips remain readable through the owner's booking. Operator booking lookup uses the separate protected /api/v1/admin/bookings APIs described below.

Missing trips return 404 TRIP_NOT_FOUND; cancelled/departed/inactive-parent trips return 409 TRIP_UNAVAILABLE; foreign-bus or unknown seats return 400 INVALID_SEATS; occupied seats return 409 SEAT_UNAVAILABLE. Input errors retain 400/415 and authentication errors use 401. Creation has a process-local IP limit of twenty requests per minute, returning 429 and Retry-After. Automatic creation retries are not idempotent: if a response is lost, inspect my bookings before submitting again; repeating occupied seats returns 409.

Trips with reservations reject actual changes to bus, route, departure, arrival, price or status with 409 TRIP_HAS_BOOKINGS; identical values remain allowed. Their deletion returns 409 TRIP_IN_USE. Existing bus capacity protection and restrictive foreign keys preserve reserved seat identities. Public availability marks reserved seats unavailable in one query snapshot without exposing passenger details; it remains a snapshot and creation performs the final check.

Read schemas/bookingSchema.ts, routes/bookingRoutes.ts, controllers/bookingController.ts and services/bookingService.ts under apps/api/src. The code follows the existing Route -> Controller -> Service -> Prisma structure. Tests cover validation, private responses, ownership even for admins, no passenger cancellation, parallel claims for a seat, multi-seat rollback, direct database constraints, separate departures, account/session revocation, unavailable trips, totals beyond int32, trip edit races, historical reads and scoped cleanup. Local development data is preserved.

Reservation verification: all ten migrations applied to a new temporary database, with zero changes on a second run. All twelve PostgreSQL integration tests passed there. A compiled JavaScript HTTP smoke test exercised competing seat reservations, JSON price totals, owner-only detail lookup, public availability, rejection of booked-trip edits, and absent passenger cancellation routes. Its fixtures and temporary database were removed. The complete default suite has 116 passing tests; type checks, lint, formatting and build pass. Existing development cities/trips remained unchanged, with no test users or reservations left behind.

## Bus types and amenities

Apply npm run db:migrate before starting the updated API. The additive migration creates BusType, Amenity and BusAmenity and adds nullable Bus.busTypeId. Existing buses keep a null type and empty amenities; seats, trips and bookings remain unchanged. No category is assigned automatically and no extra dependency or environment variable is needed.

All of these endpoints require an active, verified ADMIN or SUPER_ADMIN session with Authorization: Bearer ACCESS_TOKEN and disable caching. Passengers and anonymous callers cannot manage or list the catalogs directly; passenger trip search/details include the assigned labels.

| Resource  | List/create                | Detail/update/delete                   |
| --------- | -------------------------- | -------------------------------------- |
| Bus types | GET/POST /api/v1/bus-types | GET/PATCH/DELETE /api/v1/bus-types/:id |
| Amenities | GET/POST /api/v1/amenities | GET/PATCH/DELETE /api/v1/amenities/:id |

Both resources accept code, nameAr and nameEn when creating. PATCH accepts any nonempty subset. Names are trimmed and contain 1-100 characters. Codes are trimmed, uppercased and contain 1-32 ASCII letters/digits/underscores, beginning with a letter. Each resource has its own unique-code constraint and database code-format check. Lists sort by code then UUID and support the existing limit/offset bounds. Unknown body/query fields are rejected; writes require JSON. Detail/update/delete paths require UUIDs and no query parameters.

Example bus type and amenity bodies:

```json
{ "code": "VIP", "nameAr": "مميز", "nameEn": "Premium" }
```

```json
{ "code": "WIFI", "nameAr": "واي فاي", "nameEn": "Wi-Fi" }
```

Use the returned ids when creating or patching a bus:

```json
{
  "busTypeId": "BUS_TYPE_UUID",
  "amenityIds": ["WIFI_UUID", "USB_UUID"]
}
```

Bus POST still requires plateNumber and seatCount. busTypeId is an optional existing UUID or null; amenityIds is an optional array of up to thirty distinct existing UUIDs. PATCH preserves either assignment when omitted; null clears the type and [] clears amenities. amenityIds replaces the complete set rather than appending. Requests reject nested busType/amenities objects and duplicate or invalid ids. GET /api/v1/buses additionally accepts a busTypeId UUID filter alongside pagination and isActive.

Bus management responses now contain busTypeId, busType (id/code/nameAr/nameEn or null), and a flat amenities array sorted by code/UUID. Passenger search and details expose only id, seatCount, seatLayout, busType and amenities under bus. Raw BusAmenity links and plate numbers stay private. Related labels are loaded with the existing included relations, without per-trip lookup loops. Seat availability includes the fixed seatLayout code, numbered seats and counts.

BusType is a one-to-many relation: one bus may have one type, and many buses can share it. Amenities use the explicit BusAmenity join table because a bus can offer several amenities and an amenity can belong to several buses. UNIQUE(busId, amenityId) prevents duplicate links. Deleting a bus cascades only its links; deleting a type or amenity that is still assigned returns 409 BUS_TYPE_IN_USE or AMENITY_IN_USE. Duplicate normalized codes return 409 BUS_TYPE_CODE_EXISTS or AMENITY_CODE_EXISTS. Missing resource or assignment ids return 404 BUS_TYPE_NOT_FOUND or AMENITY_NOT_FOUND.

Creation saves the bus, seats and amenity links in one transaction. Updating locks the bus and validates all catalog references before making changes; seat resizing, scalar changes and complete amenity-set replacement commit together. Bad references or conflicting plates roll back the whole request. Parallel replacements serialize, so their sets cannot merge accidentally. Parent catalog rows are locked against deletion/definition changes during assignment.

A bus with any reservation, including a past one, rejects actual type or amenity-set changes with 409 BUS_HAS_BOOKINGS. Updating the code or names of a type/amenity used by a reserved bus returns 409 BUS_TYPE_HAS_BOOKINGS or AMENITY_HAS_BOOKINGS. Identical assignments and identical labels remain allowed. The first reservation locks its type and amenities while holding the bus lock, so concurrent definition edits or assignment changes either finish before reservation or are refused after it. This conservative rule preserves the advertised service until a later feature supports per-departure historical metadata. Existing seat-capacity and booked-trip protections remain in place; passenger cancellation stays unavailable.

Read schemas/fleetMetadataSchema.ts for common validation, services/busTypeService.ts and services/amenityService.ts for separate catalog behavior, and services/busService.ts for atomic assignments. Corresponding controllers and routers follow the existing structure. utils/busMetadata.ts produces the flat public labels used by trip search/details. These paths are under apps/api/src. Tests cover admin authorization, CRUD, code uniqueness, invalid references, clearing/preserving assignments, atomic rollback, simultaneous set replacements, public projections, default null/empty metadata and reservation races.

Fleet verification: all eleven migrations applied to an empty temporary database, with zero applied on a second run. All thirteen PostgreSQL integration tests passed there. A compiled JavaScript HTTP smoke test created metadata through protected APIs, assigned it to a bus, checked public search/details without plate leakage, created a reservation and verified metadata mutation/deletion guards. Fixtures and the temporary database were removed. The 124 default tests, type checks, lint and build pass; existing development catalog data was preserved with no extra types, amenities, links, users or reservations left behind.

## Fixed seat templates

Apply npm run db:migrate. A forward migration removes the deprecated BusLayout/BusLayoutCell tables and adds nullable Bus.seatLayout. Bus, BusSeat, Trip, Booking and BookingSeat records stay intact. Previous migrations remain in Git so the complete history can be replayed. The old editable-grid endpoints and optional booking layoutId are removed; clients sending layoutId receive 400 for an unsupported field. No new dependency or environment variable is needed.

### Choose a template when adding a bus

Use the existing administrator POST /api/v1/buses or PATCH /api/v1/buses/:id:

```json
{
  "plateNumber": "ABC 123",
  "seatCount": 44,
  "seatLayout": "STANDARD_2_2"
}
```

STANDARD_2_2 means sequential seats, four per row, two on the vehicle's left and two on its right, with an aisle between them. The front of the bus is at the top. Numbering runs left to right across a row, then toward the rear:

```text
       FRONT / DRIVER
  1   2      aisle      3   4
  5   6      aisle      7   8
  9  10      aisle     11  12
```

Continue until seatCount. If the last row is incomplete, fill its positions in the same order and leave the remaining positions empty. The later frontend will draw this template using CSS and seat icons; there is no frontend or visual map editor in this backend change. For seat number n, the zero-based row is Math.floor((n - 1) / 4), and the position in that row is (n - 1) % 4. Keep this physical grid dir="ltr" when rendering Arabic; translate labels separately. The driver icon identifies the vehicle front and does not consume a numbered seat.

This generic template does not describe toilets, missing middle seats, a five-seat rear bench, a second deck, or different manufacturer numbering. The supplied Bluebus screenshots contain a WC and gaps but do not show the whole bus. Their exact layout has not been inferred. For another real arrangement, add a named, fixed template in code after confirming its full numbering and positions, then choose that template for matching buses. A single template is shared by all buses that physically match it; do not add per-seat database coordinates. Once a template is used, keep its numbering/positions unchanged in code; introduce a new template code for a different arrangement.

Omitting seatLayout on creation defaults it to null. Existing buses also remain null: do not claim window/aisle positions for an unclassified bus. Such buses keep the existing numbered-seat booking flow. Before creating trips, choose a template only if it matches the real vehicle. PATCH omission preserves the current value; null clears it only while the bus has no trips. Only STANDARD_2_2 and null are accepted by the API and PostgreSQL.

### Stable seats and bookings

A bus used by any trip cannot change seatCount or seatLayout (409 BUS_HAS_TRIPS), including cancelled or past trips. A no-op update is allowed. Capacity edits on unused buses preserve retained seat ids. Template selection/clearing never regenerates seats. Bus updates and trip creation use the same bus row lock, so concurrent requests cannot bypass the rule. Other bus metadata retains its existing reservation protections.

Passenger search/details expose bus.seatLayout; GET /api/v1/trips/:id/seats returns seatLayout alongside tripId, busId, totalSeats, availableSeats and seats. Each seat still contains id, number and isAvailable. The frontend uses the template and number to draw its position, and isAvailable to style/disable it. The same physical seat may be available on one trip and reserved on another.

Booking input stays simple: tripId, contactPhone and passengers with seatId/name. The backend validates ownership, the trip's assigned bus and seat ids, availability and server-side prices. Atomic reservations and the unique (tripId, seatId) constraint still prevent double booking. Passenger cancellation remains unavailable.

Read schemas/busSchema.ts for allowed template values, services/busService.ts for stable seats and trip guards, services/tripDetailsService.ts for seat availability, services/tripSearchService.ts for passenger bus data, and prisma/contract.prisma for the nullable field and database enum constraint. These paths are under apps/api/src. No separate layout controller, service or schema is needed.

Tests cover template validation/defaults, preserved seat ids, public responses, unknown database values, no-op updates, rollback, historical-trip guards, concurrent trip creation/template changes, and real reservations on a configured bus without layoutId. Run the default checks and npm run test:db as described above.

Verification: all 126 default tests and all 14 PostgreSQL integration tests pass, together with TypeScript checks, lint, formatting and build. In an isolated temporary database, the first twelve migrations were replayed, a legacy layout plus a real linked reservation were inserted, and the thirteenth migration preserved the bus, seat, trip, user and booking rows exactly while removing only obsolete layout data. Re-running migrations applied zero changes. The temporary database was removed. Development data was also compared before/after its migration, and compiled JavaScript passed real HTTP health and passenger-seat checks.

## Batch trip preview and creation

Authorized ADMIN/SUPER_ADMIN users can create departures for a finite date range through the existing Trip model. No schema migration, dependency, worker or new environment setting is needed. Every saved departure is an ordinary independent Trip; this is not an indefinitely recurring schedule or a bulk-edit/cancellation API.

| Method | Path                        | Result                                                              |
| ------ | --------------------------- | ------------------------------------------------------------------- |
| POST   | /api/v1/trips/batch/preview | 200: compute departures and current conflicts, without saving trips |
| POST   | /api/v1/trips/batch         | 201: create the entire group, or reject it without saving any trips |

Both endpoints require an administrator Bearer access token, application/json, no query parameters and this same body:

```json
{
  "routeId": "ROUTE_UUID",
  "busId": "BUS_UUID",
  "startDate": "2026-11-01",
  "endDate": "2026-11-07",
  "weekdays": [1, 2, 3, 4, 6, 7],
  "departureTime": "09:00",
  "durationMinutes": 180,
  "pricePiastres": 30000
}
```

Replace ids with existing active catalog records and use future travel dates. Weekdays use ISO numbering: Monday 1, Tuesday 2, Wednesday 3, Thursday 4, Friday 5, Saturday 6, Sunday 7. The example selects every day except Friday and generates six departures at 09:00 Cairo time, each lasting 180 minutes and priced at EGP 300 per seat. The interval includes both startDate and endDate and is limited to 90 calendar days, so at most 90 departures are generated. Weekdays must be distinct integers, with at least one chosen day. All fields are required; client-provided ids/status/timeZone or additional fields are rejected.

Dates are strict YYYY-MM-DD; departureTime is 24-hour HH:mm in Africa/Cairo. The allowed duration is an integer 1-10080 elapsed minutes and pricePiastres an integer 0-2147483647. Start must not follow end. Every generated departure must be in the future, and the period must contain at least one selected weekday. Invalid input returns 400 VALIDATION_ERROR; no matching dates return 400 NO_DEPARTURES. Local Cairo times skipped or repeated at a daylight-saving transition return 400 INVALID_DEPARTURE_TIME with the affected date; choose a different unambiguous departure time. The existing Temporal dependency computes each calendar date's Cairo offset separately, and the duration is added to the resulting instant. UTC departure/arrival timestamps are returned for storage and API consistency.

### Read the preview

The preview response wraps its result in data: timeZone, canCreate, totalTrips and trips sorted chronologically. Each row contains date (the Cairo departure date), routeId, busId, departureAt, arrivalAt, pricePiastres, status SCHEDULED and conflicts. Preview rows do not have persisted Trip ids.

- An existing scheduled departure on the same bus appears as { type: EXISTING_TRIP, tripId } in each affected row.
- Proposed departures that overlap one another appear as { type: BATCH_TRIP, date }, pointing to the other proposed departure's local date.
- A row with conflicts has a nonempty conflicts array; canCreate is true only when every row is free of conflicts. A conflict preview still returns 200 so the dashboard can display the affected dates.

Cancelled trips do not occupy the bus schedule. Different buses can operate at the same time. Intervals that touch at one endpoint are allowed, consistent with single-trip management; no turnaround buffer or vehicle-location feasibility rule is added here. Both the route and bus must exist and be active: otherwise the API returns ROUTE_NOT_FOUND/BUS_NOT_FOUND (404) or ROUTE_INACTIVE/BUS_INACTIVE (409).

### Confirm the group

After reviewing the preview, POST the same input to /api/v1/trips/batch. Send the scheduling input, not the preview response. Confirmation recomputes departures, locks the route and bus, checks the clock and current catalog state again, and reloads schedule conflicts. A preview does not reserve a bus and is not a guarantee that later confirmation will succeed. API clients may call creation directly; it enforces all the same rules. The later dashboard will show preview before its confirmation button.

On success, data contains timeZone, totalTrips and the newly persisted trips with their unique ids. All are SCHEDULED. All inserts share one PostgreSQL transaction; an error rolls back the whole group. A schedule conflict returns 409 BUS_SCHEDULE_CONFLICT without saving any rows from the request. Refresh the preview, resolve the conflict and submit again. Repeating a successful request while its departures are still scheduled returns a conflict instead of duplicating the group; there is no separate request-token/idempotency API.

Single-trip writes and batch operations use the same Route FOR SHARE then Bus FOR UPDATE lock order and the same overlap query. This serializes concurrent batches, individual creates and edits on the target bus. Ordinary catalog guards continue to protect seat templates/capacity once trips exist. Existing booking prices, ownership, seat allocations and the prohibition on passenger cancellation are unchanged. Generated trips can be edited independently through the existing single-trip endpoints and their reservation safeguards.

Read apps/api/src/schemas/tripBatchSchema.ts for request validation, utils/tripBatchDates.ts for calendar generation, controllers/tripBatchController.ts and routes/tripRoutes.ts for HTTP handling, services/tripBatchService.ts for preview/atomic creation, and services/tripScheduling.ts for the shared parent locks and overlap rules. Tests cover calendar boundaries, Cairo DST, strict input, authorization, read-only preview, existing/internal conflicts, changed state after preview, repeated requests, touching intervals, independent trip editing, the 90-departure limit and concurrent single/batch creation. The passenger site and dashboard forms will be implemented in their later phases.

Batch verification: all 133 default tests and all 15 PostgreSQL integration tests pass, as do TypeScript checking, lint, formatting and build. All thirteen existing migrations were replayed on an empty temporary database. A compiled JavaScript HTTP check then verified preview without writes, complete creation, duplicate-request rejection and passenger seats for a generated departure. Scoped fixtures and the temporary database were removed. No new migration or package change is required for this feature.

## Administrator booking lists and details

Apply npm run db:migrate before using this feature. This adds only a Booking(createdAt, id) index for the global newest-first administration list; no table or existing booking row is replaced. The existing user/time, trip and unique reference indexes also serve exact filters. No dependency or new environment variable is needed.

| Method | Path                       | Result                                                       |
| ------ | -------------------------- | ------------------------------------------------------------ |
| GET    | /api/v1/admin/bookings     | Paginated reservation summaries across customers             |
| GET    | /api/v1/admin/bookings/:id | One reservation, its customer and its named seat allocations |

Both routes require a verified active ADMIN or SUPER_ADMIN account with a valid Bearer access token. Authentication/role checks run before filter/id validation; anonymous requests return 401 and passengers return 403. Replies use Cache-Control: no-store. Role changes, account deactivation and session revocation are enforced by the existing database-backed session check, including for previously issued JWTs.

### Search and pagination

Optional query fields on the list are combined with AND:

| Field      | Meaning                                                                                |
| ---------- | -------------------------------------------------------------------------------------- |
| reference  | Full BUS- plus 16 hexadecimal characters; trimmed and uppercased before exact matching |
| email      | Customer account email; trimmed/lowercased before exact matching                       |
| userId     | Exact customer account UUID                                                            |
| tripId     | Exact departure UUID                                                                   |
| travelDate | Trip departure date in Africa/Cairo, YYYY-MM-DD, years 2000-9998                       |
| limit      | Page size 1-100, default 20                                                            |
| offset     | Rows to skip 0-100000, default 0                                                       |

Examples: GET /api/v1/admin/bookings?reference=BUS-0123456789ABCDEF or GET /api/v1/admin/bookings?email=customer%40example.com&travelDate=2026-11-01&limit=20&offset=0. Replace these placeholders with real booking/customer data. Reference/email searches are exact, not partial or wildcard searches. URL-encode query values. Repeated, malformed, unknown and nested query fields return 400 VALIDATION_ERROR. Valid filters that match no reservations return data: [] with normal pagination, not 404. travelDate uses the Cairo day's inclusive start and exclusive end, including daylight-saving changes; it is not the booking creation date or the UTC departure date.

List replies contain data: [...] and pagination: { limit, offset }. Results sort by createdAt descending, then id descending for deterministic ties. Each summary contains the existing reservation reference/status/contact phone, seat count, integer-piastre price snapshot/total, currency EGP, paymentRequired: false, createdAt and trip/route/station/city information. It adds customer: { id, name, email, phone } and trip.status. Customer phone is the account phone; contactPhone is the separate phone supplied with that booking. Passenger names and seat allocation arrays are omitted from list queries and responses.

### Read details

GET /api/v1/admin/bookings/:id returns data with the same summary/customer fields plus passengers: [{ seatId, seatNumber, name }], sorted by seatNumber. An invalid UUID or any detail query parameter returns 400. A valid UUID for a missing reservation returns 404 BOOKING_NOT_FOUND. Account fields are explicitly selected: passwords, role, activation/reset codes, login/lockout fields and session/refresh-token data are not returned. Bus plate information is not part of this response; fleet management remains available through its existing protected API.

Operational reads include historical trips, cancelled trips and inactive catalog records; passenger trip-search eligibility must not hide an existing reservation from an operator. Money remains the stored reservation snapshot, and RESERVED still means a reservation without collected payment. This feature does not add payment states, edits, cancellation, refunds or mutation endpoints.

Passenger GET /api/v1/bookings and GET /api/v1/bookings/:id keep their original response and authenticated-owner checks, even when an administrator calls them. Use the separate protected admin routes to read customers' bookings. Public search/details/seat availability still expose no customer or passenger identity. Passenger cancellation remains unavailable.

Read apps/api/src/schemas/adminBookingSchema.ts for exact filters, controllers/adminBookingController.ts for validation and HTTP responses, routes/adminBookingRoutes.ts for protected read routes, and services/adminBookingService.ts for queries and safe account projections. bookingService.ts now shares its base booking query and price/trip summary serializer with the operator service, preserving the passenger response. No repository layer is introduced.

Passenger account listing and suspension/activation are now implemented below. Super-admin administrator management is now implemented below. Expiring seat holds are now implemented below. Remaining backend work: sandbox payment states/provider/webhooks; QR tickets, confirmations and reminders; agreed operator cancellation/refunds; dashboard metrics; then readiness/logging, expired-data cleanup, shared rate limits when needed, CI and backend integration verification. The hold duration is ten minutes, capped at departure. Operator cancellation/refund policy must be settled before dependent paid-booking work. Passenger cancellation stays disabled. Production provider onboarding/deployment follow in the release phase; the passenger site and dashboard follow backend completion.

Administrator booking verification: all 138 default tests and all 16 PostgreSQL integration tests passed, along with strict types, lint, formatting and build. All fourteen migrations applied to an empty temporary database; a second run applied zero. Compiled JavaScript passed real login, reservation, administrator list/detail and passenger-ownership HTTP checks. Applying the new index to development left all compared business rows unchanged. Scoped fixtures and the temporary database were removed.

## Passenger account management

Apply npm run db:migrate. This feature adds only User(role, createdAt, id) and User(phone) indexes for ordered passenger lookup and exact phone searches. No new model, dependency or environment variable is introduced. Existing accounts, reservations and allocations stay in place.

| Method | Path                           | Result                                       |
| ------ | ------------------------------ | -------------------------------------------- |
| GET    | /api/v1/admin/users            | Paginated passenger accounts                 |
| GET    | /api/v1/admin/users/:id        | One passenger account                        |
| PATCH  | /api/v1/admin/users/:id/status | Set the passenger account's isActive boolean |

All routes require a verified active ADMIN or SUPER_ADMIN using a Bearer access token. Role/authentication checks precede validation, and responses use Cache-Control: no-store. The routes only manage role USER: staff accounts never appear in the list, and staff ids return the same 404 USER_NOT_FOUND as missing accounts on detail/status requests, including when called by a super admin. Separate administrator management is available to SUPER_ADMIN at /api/v1/admin/admins. These routes cannot modify roles, profile fields, email, passwords or delete accounts.

### Read passenger accounts

List filters are optional and combined with AND: email (trimmed/lowercased exact account email), phone (exact international account phone), isActive (query string true/false), limit (1-100, default 20) and offset (0-100000, default 0). No partial/wildcard name search or role filter is supported. Phone numbers are not unique: matching passenger accounts are all eligible results. URL-encode phone values, especially the plus sign: /api/v1/admin/users?phone=%2B201012345678&isActive=false.

List responses are { data: [...], pagination: { limit, offset } }; empty matches return 200 with an empty data array. Order is createdAt descending then id descending for deterministic ties. Detail returns { data: account }. The selected fields are id, name, email, phone, role USER, language, isActive, emailVerifiedAt (nullable ISO string) and createdAt (ISO string). Password hashes, activation/reset codes, sessions, refresh tokens and login-failure/lockout fields are not loaded for the public account projection. Detail/status routes reject all query parameters; unsupported, repeated, nested or malformed filters/ids return 400 VALIDATION_ERROR.

Use /api/v1/admin/bookings?userId=USER_UUID for a customer's reservation history; the user list does not fetch or expose reservation/passenger arrays.

### Suspend or reactivate

Send application/json to PATCH /api/v1/admin/users/USER_UUID/status with exactly:

```json
{ "isActive": false }
```

false suspends the account; true reactivates it. Strings such as "false", missing fields, null, extra fields and role changes are rejected. Success returns 200 with the safe updated account. Unknown/staff ids return 404; unsupported content type returns 415.

Suspension updates User.isActive and revokes all of the account's unrevoked sessions inside one transaction. Existing access tokens then fail the normal database-backed session check; refresh cookies fail too. Sign-in while suspended keeps the existing generic 401 INVALID_CREDENTIALS response. Revocation is permanent for those sessions: reactivation requires a fresh sign-in, and old access/refresh tokens stay unusable. Repeating suspension does not rewrite existing revocation timestamps; repeating activation does not log out a currently active session.

Reactivation is separate from email verification, password recovery and timed login lockout. It does not mark an unverified email verified, change a password, reset login failures or clear lockedUntil. Existing verification/reset flows do not reactivate a suspended account. Suspension does not delete bookings, release occupied seats, change prices or enable passenger cancellation. Operators can continue reading the suspended passenger's existing bookings through protected booking management.

Status writes take the same email advisory lock as login/reset/logout-all, then lock the target User row and revoke Session rows in User -> Session order. They recheck role USER under the row lock so promotion/deletion cannot turn a passenger operation into a staff edit. Login either completes before suspension and its session is revoked, or sees the inactive account and fails. A concurrent refresh cannot leave a session usable after suspension commits. Booking transactions already lock the user before its session: a reservation completes before suspension or fails after it; completed reservations are retained.

Read apps/api/src/schemas/adminUserSchema.ts for strict request rules, controllers/adminUserController.ts and routes/adminUserRoutes.ts for the protected HTTP API, and services/adminUserService.ts for safe projections, filtering, locks and atomic revocation. Existing sessionService.ts enforces active/verified accounts and revoked sessions on login, refresh and authenticated requests. Tests cover multiple devices, reactivation without token revival, protected staff accounts, exact filters, pagination, pending email verification, booking preservation and concurrent login/refresh/reservation requests.

PostgreSQL test files run sequentially via npm run test:db (--test-concurrency=1), because first-super-admin bootstrap examines global staff state and must not overlap another file creating staff fixtures. Concurrent login, refresh, reservation and scheduling requests remain explicitly tested inside individual files. This changes test-file execution only, not application request concurrency.

Passenger management verification: all 144 default tests and all 17 PostgreSQL integration tests pass, together with strict types, lint, formatting and build. All fifteen migrations applied to an empty temporary database; repeating migration applied zero. Compiled JavaScript HTTP checks verified account lookup, protected staff targets, suspension, permanent access/refresh-token revocation and successful fresh sign-in after reactivation. Applying the two indexes to development preserved all compared business rows. Scoped fixtures and the temporary database were removed.

## Super-admin administrator management

No migration, package or environment change is needed. This feature uses the existing User roles, active/verified state, Session rows and role/time index. Accounts register and verify through the existing flow; staff management does not create accounts, passwords or verification bypasses.

| Method | Path                            | Result                                                   |
| ------ | ------------------------------- | -------------------------------------------------------- |
| GET    | /api/v1/admin/admins            | Paginated ADMIN/SUPER_ADMIN accounts                     |
| GET    | /api/v1/admin/admins/:id        | One staff account                                        |
| PATCH  | /api/v1/admin/admins/:id/role   | Assign USER, ADMIN or SUPER_ADMIN to an existing account |
| PATCH  | /api/v1/admin/admins/:id/status | Suspend/reactivate an existing staff account             |

All endpoints require a verified active SUPER_ADMIN with a valid Bearer token. Ordinary ADMIN and USER accounts receive 403, anonymous callers 401. Checks run before input validation and replies use Cache-Control: no-store. There is no HTTP bootstrap, account creation, password editing, unrestricted profile editing or deletion endpoint.

The staff list accepts optional exact email (trimmed/lowercased), role ADMIN/SUPER_ADMIN, isActive true/false, limit 1-100 (default 20), and offset 0-100000 (default 0). Filters combine with AND. It returns { data: [...], pagination: { limit, offset } } sorted by createdAt descending then id descending. Empty matches return 200 and an empty array. Read/status queries exclude USER accounts; a missing or passenger detail/status target returns 404 ADMINISTRATOR_NOT_FOUND. Staff responses share the selected safe account fields used by passenger management: id, name, email, phone, role, language, isActive, emailVerifiedAt and createdAt. No password, reset/activation code, lockout field or session/token data is exposed.

### Grant or remove a staff role

Select an existing account id, for example from passenger management, and send application/json to PATCH /api/v1/admin/admins/ACCOUNT_UUID/role:

```json
{ "role": "ADMIN" }
```

ADMIN grants ordinary management access. SUPER_ADMIN grants administrator-management access as well and can establish a backup super admin. USER removes staff privileges. A role change granting ADMIN/SUPER_ADMIN requires the target to already be active and email-verified; otherwise it returns 409 ACCOUNT_NOT_READY without altering the account. The caller cannot supply a password, email, isActive or other field in this request. A missing role target returns 404 USER_NOT_FOUND.

Changing a role revokes all of the target's existing sessions atomically with the User update; the account must sign in again. This includes a passenger promoted to staff and staff demoted to USER. Names, email, phone, verification, active state, password and existing bookings are preserved. A same-role update on an active account preserves its sessions. A demoted account leaves the staff list and is visible through passenger management again. Self-demotion is permitted only when another qualified super admin remains; the caller's own old session is then invalidated.

### Change staff status and protect the last super admin

PATCH /api/v1/admin/admins/STAFF_UUID/status accepts exactly { "isActive": false } or { "isActive": true }. Suspension revokes every current session. Reactivation requires fresh sign-in; it cannot revive old tokens, verify an email or clear password/login-lockout state. Repeating suspension preserves previously stored revocation timestamps. Staff status cannot be changed through the passenger-account endpoints.

Before demoting or suspending a SUPER_ADMIN, the transaction requires another SUPER_ADMIN whose isActive is true and emailVerifiedAt is set. Inactive and unverified backup accounts do not count. If the change would remove the last such account, the API returns 409 LAST_SUPER_ADMIN without changing the role/status or revoking sessions. Self-suspension is subject to this same rule. The guard concerns account role, active state and email verification; it does not require the other account to currently have a session.

All staff mutations and local bootstrap share one PostgreSQL advisory lock, acquired before the target's email lock, User row lock and Session updates. This serializes last-super-admin checks, including concurrent demotions/suspensions. The service rechecks the caller's current session and SUPER_ADMIN role inside the transaction and again after waiting for the target lock. If another staff operation demotes/revokes that caller first, its waiting request cannot continue under obsolete authority. Passenger suspension uses the same target email/User protocol and rechecks role USER, preventing a competing promotion from producing an inactive newly promoted administrator.

Use the local admin:bootstrap command only to establish the first super admin as documented above. It now shares the staff-mutation lock and still refuses a different target once any SUPER_ADMIN exists. There is no default or permanent admin fixture. As with other management guarantees, direct privileged database changes must follow this protocol; role/status controls are enforced by these service transactions.

Read apps/api/src/schemas/administratorSchema.ts, controllers/administratorController.ts and routes/administratorRoutes.ts for the HTTP contract, services/administratorService.ts for actor revalidation/eligibility/last-super-admin guards, and services/administratorLocks.ts for the lock shared with adminBootstrapService.ts. adminUserService.ts shares the safe account query/serializer while its passenger endpoints retain role USER scoping. Tests cover authorization, promotion/demotion, active/verified eligibility, session revocation, staff suspension/reactivation, protected passenger routes, last-account failures, concurrent self-demotion/self-suspension, cross-demotion with stale actors and promotion versus passenger suspension. Integration fixtures only modify their own accounts; fresh-database verification exercises the last-account cases independently of existing local operators.

Administrator management verification: all 151 default tests and all 18 PostgreSQL integration tests passed, along with strict types, lint, formatting and build. The existing fifteen migrations replayed on an empty temporary database; repeating migration applied zero changes. Compiled JavaScript HTTP checks verified bootstrap, promotion, old-session revocation, transfer to another super admin and rejection of removing the last active verified super admin. Compared development business rows remained unchanged, and scoped fixtures/temporary databases were removed. No new migration or dependency is required.

## Administrator audit log

Successful business changes through the administrative API now write an AuditLog row in the **same PostgreSQL transaction** as the change. An audit insert failure aborts the change. Unchanged values, failed validation/authorization, rejected business operations, read requests and batch previews create no audit row. A successful batch writes one CREATE row per generated Trip.

Covered mutations: City, Station, Route, Bus (including template/count/type/amenity assignments), BusType, Amenity, Trip, passenger activation/suspension, administrator roles/status, and the local first-super-admin bootstrap. Registration, login, passenger reservations, direct SQL/Prisma scripts and seed operations are not administrative audit events. Calling a catalog service internally without an authenticated actor records null actorId/actorRole; BOOTSTRAP also has a null actor because it is a local operator command. Null does not identify a signed-in administrator.

| Method | Endpoint                     | Access      |
| ------ | ---------------------------- | ----------- |
| GET    | /api/v1/admin/audit-logs     | SUPER_ADMIN |
| GET    | /api/v1/admin/audit-logs/:id | SUPER_ADMIN |

The list supports limit (1-100, default 20), offset (0-100000), actorId UUID, entity, entityId UUID, action, from and to. Filters combine with AND. Entity is City, Station, Route, Bus, BusType, Amenity, Trip or User; action is CREATE, UPDATE, DELETE or BOOTSTRAP. The from/to filters are inclusive ISO timestamps with a timezone, and from must not follow to. Results are newest first, ordered by createdAt then id for stable pagination. Query parameters on detail requests are rejected. Read responses use Cache-Control: no-store.

Example: GET /api/v1/admin/audit-logs?entity=Trip&action=UPDATE&limit=20&offset=0 with a super-admin bearer token.

Each entry contains id, actorId, actorRole, action, entity, entityId, before, after and createdAt. The actor comes from authenticated server context, never from request JSON. CREATE has before:null; DELETE has after:null. User snapshots contain **only role and isActive**. Catalog snapshots use explicit business-field allowlists. Password hashes, email addresses, phone numbers, passenger names, verification codes, cookies and tokens are not audit payloads. Bus plate numbers remain operational audit data visible only to super admins.

The Prisma contract stores beforeJson/afterJson as serialized JSON text; the read service exposes parsed before/after objects. Independent actor/entity identifiers deliberately have no foreign keys: deleting an account or catalog row must not delete its history. There are no audit create/update/delete API endpoints. This is application-level history, not a tamper-proof ledger against database administrators. Automatic retention/deletion is not enabled, and existing historical changes are not backfilled.

Important files: apps/api/src/services/auditWriter.ts (allowlists and transaction insert), auditLogService.ts (queries), schemas/auditLogSchema.ts (filters), controllers/auditLogController.ts and routes/auditLogRoutes.ts (HTTP reads). Business services call recordAudit before committing. No external package or environment variable is required. Apply the additive AuditLog migration with npm run db:migrate before running the updated API. Database verification uses an isolated temporary database so test-created audit events do not pollute development history.

## Expiring checkout seat holds

This section supersedes the immediate-reservation behavior in the earlier reservation MVP walkthrough. POST /api/v1/bookings now starts checkout: it creates PENDING_PAYMENT with paymentRequired:true and a server-generated expiresAt, at most ten minutes from creation and never after departure. Existing RESERVED bookings keep their status, expiresAt:null and paymentRequired:false; the migration never expires or deletes existing reservations. The following sections describe payment creation/reconciliation and gated owner checkout; no public manual confirmation endpoint exists.

The request shape is unchanged: tripId, contactPhone and passengers with seatId/name. Clients cannot supply status, expiry, prices or an owner. Opening or clicking the frontend seat map will not call this endpoint; the future frontend calls it on Continue to payment. Repeating the same occupied-seat request returns SEAT_UNAVAILABLE and does not extend the original deadline. My-booking and administrator-booking reads include expiresAt and show EXPIRED/paymentRequired:false once the deadline is reached, even before cleanup persists that status.

The existing User -> Session -> Trip -> Route -> Bus/catalog lock order is preserved. Inside the short Trip row lock, checkout releases expired allocations for that trip, checks active allocations, calculates prices and creates the hold plus seats in one transaction. The row lock is released when the request transaction ends; it is not held while a passenger pays. Multiple checkout requests or cleanup workers serialize on the same Trip row.

BookingSeat retains passenger/seat snapshots after expiry. Its new releasedAt timestamp releases an allocation without deleting history. A PostgreSQL partial unique index on (tripId,seatId) WHERE releasedAt IS NULL prevents two active allocations, including when the service is bypassed. The previous all-history unique constraint is replaced atomically during the migration. History can contain the same seat across expired and new bookings, but only one unreleased allocation.

Passenger seat availability excludes expired holds immediately, using server time and the persisted deadline. A new checkout clears expired allocations under the lock even if no worker is running. The worker persists EXPIRED and releasedAt for due holds, processing up to 100 candidate bookings per pass and every affected trip atomically. Multiple worker instances are safe. A successful cleanup pass is repeatable; a failed transaction rolls back both status and release.

Run npm run booking:worker in a separate terminal for a pass every 30 seconds, or npm run booking:expire for one pass. Neither command needs a new package or environment variable; both use the API environment. Stopping the worker cannot allow double booking or keep an expired seat unavailable through the API. Physical cleanup can lag while reads already report the effective expired state. Empty cleanup reports processedTrips:0.

Existing conservative trip/fleet history guards still apply to all booking records, including expired holds: changing an already-used trip or booked bus metadata remains restricted. Passenger cancellation, hold extension and manual confirmation remain unavailable. Expiry is an automatic pre-payment transition, not passenger cancellation. The next payment feature must share the Trip lock and recheck the exact expiry before confirming; a delayed payment success cannot take a seat from a newer booking. It must define handling/reconciliation for payment success after expiry before accepting payments.

## Paymob TEST provider foundation

The payment-provider transport layer is now implemented for Paymob Egypt and EGP. This replaces the earlier PayPal proposal because the booking amounts are in EGP. This section describes the provider transport foundation. Durable payment processing and the separately gated owner checkout endpoints are described in the later sections; actual merchant TEST verification remains outstanding. A preparation-only PaymentAttempt table and owner endpoints are described below. Signed webhook receipt is implemented separately below. Existing checkout holds still expire as described above. No database migration or dependency installation is needed for this step. The project owner now has a Paymob account and local TEST credentials. An API-key authentication check succeeded; it did not create a payment or verify Auth/Cap capability.

Files to read:

- apps/api/src/config/paymob.ts validates optional TEST-only settings, identifiers and HTTPS URLs without exposing secret values.
- apps/api/src/payments/paymentProvider.ts defines the small provider interface and a safe error with an uncertain-outcome flag.
- apps/api/src/payments/paymobProvider.ts implements authorization intention creation, capture, authorization void and transaction inquiry using Node fetch. It uses only https://accept.paymob.com, disables redirects, has a 15-second request timeout and does not automatically retry requests. Configuration is copied after validation.
- apps/api/src/payments/paymobHmac.ts checks the documented twenty transaction fields with HMAC-SHA512 and timingSafeEqual. It returns only signed fields and a hash suitable for future event deduplication; unsigned fields, customer details and card fragments are not returned. Verification alone does not apply booking mutations or establish that a payment belongs to a booking.
- apps/api/src/scripts/checkPayments.ts checks local configuration only, without a database or network request.

Run from the project root:

```powershell
npm run payment:check
```

With no settings it reports disabled. The optional settings are documented as comments in apps/api/.env.example. Put real test values only in apps/api/.env, which is ignored by Git. PAYMOB_ENABLED=true requires every Paymob field; secret/public keys must use TEST prefixes. PAYMOB_API_KEY is used to obtain a bearer token for inquiry; PAYMOB_HMAC_SECRET is a separate callback-signing secret. PAYMOB_OWNER_ID must match the owner field of a real transaction inquiry, not an assumed profile or merchant id. The notification and return URLs must be HTTPS without credentials, query strings or fragments. The callback route now exists; its public HTTPS address and the frontend result page still need setup. PAYMOB_ENABLED controls strict provider configuration; webhook receipt has its own opt-in flag below.

PAYMOB_AUTH_CAPTURE_ENABLED=true is a local declaration, not proof from Paymob. Set it only after confirming the selected TEST card Integration ID supports Auth/Cap. The adapter requests is_auth:true; this request shape must be verified with the actual merchant integration before exposing checkout. If the account expects a different Auth setting, adapt it based on the account's current API reference instead of silently falling back to standalone charging. Wallets, kiosk payments and other methods are outside this first card-only flow. No live-money support is enabled.

Authorization creation accepts an internal server-calculated integer-piastre amount and booking expiry; it never chooses prices from frontend input. It sends only the remaining whole seconds of the hold (at most ten minutes) and refuses expired/subsecond holds. A slow response received after expiry does not expose a checkout URL. An HTTP success for capture or void is only an acknowledgement: the future service must verify the final transaction state before confirming a booking or releasing its allocation. Transport failures, malformed creation responses and failed POST responses remain uncertain and must be reconciled by inquiry, not blindly retried. The service must persist operation intent before sending a request. The adapter itself does not provide idempotency, seat locking or reconciliation.

The proposed integration will authorize first, then take a short Trip lock to validate the hold and persist a capture-in-progress state. It will keep seats allocated throughout capture and uncertain outcomes, with no database lock held across network calls. Late authorization will be voided without capturing funds. This reduces refunds for expired seats; it cannot eliminate refunds after actual collection or operator cancellation. Do not enable paid booking until these durable states, event persistence, ownership/amount/order checks, reconciliation, and the operator cancellation/refund policy are implemented.

Verification covers the official independent HMAC example, modified/forged callbacks, test-only credentials, exact amounts, merchant/integration identity, mismatched intentions, expiry boundaries, slow responses, safe errors and no automatic POST retries. These are transport/configuration tests with synthetic responses, not a successful Paymob sandbox payment.

Official references: [Intention API](https://developers.paymob.com/paymob-docs/developers/intention-apis/create-intention), [Auth/Cap](https://developers.paymob.com/paymob-docs/payments-and-features/core-features/auth-cap), [Paymob-owned integration reference](https://github.com/PaymobAccept/Paymob-AI-Integration-Skill/blob/main/skills/paymob-integration/references/advanced-features.md), [HMAC field order](https://github.com/PaymobAccept/Paymob-AI-Integration-Skill/blob/main/skills/paymob-integration/references/hmac-verification.md), [Transaction inquiry](https://developers.paymob.com/paymob-docs/developers/transaction-inquiry-apis/by-transaction-id), [Credentials setup](https://developers.paymob.com/paymob-docs/need-help/setup-guides/getting-integration-credentials).

### Inspect setup before the first transaction

Run npm run payment:setup to validate TEST credential formats and list remaining settings locally, even while PAYMOB_ENABLED=false and PAYMOB_OWNER_ID is empty. Exit code 0 means credential formats pass; it does not mean paid checkout is ready. Invalid or missing credentials exit with code 1. Only field names are printed. No network, database, file changes or payment requests occur.

No existing transaction is needed to run this check or continue backend implementation. Leave the owner empty until it can be established from an authenticated TEST transaction inquiry during provider verification. Do not substitute a guessed merchant/profile id. This command does not create the first transaction. The operational provider still requires the owner, HTTPS notification/return URLs and confirmed Auth/Cap; payment:check retains strict validation when enabled. Public HTTPS callback delivery and actual merchant Auth/Cap behavior still need verification before end-to-end Paymob testing; checkout and durable reconciliation code are described below. Do not enable the provider merely because setup passes.

## Durable Paymob webhook receipt

POST /api/v1/payments/paymob/webhook?hmac=<signature> receives server-to-server JSON transaction callbacks. Its current job is durable receipt, not charging a card or confirming a booking. It needs no passenger session, cookies or browser redirect. The existing 100kb JSON limit applies. Malformed/missing/repeated HMAC query values return 400, unsupported media types 415, invalid signatures 401, and signed integration/currency/configured-owner mismatches 403. GET is not a payment-confirmation endpoint.

Apply npm run db:migrate before enabling receipt. In apps/api/.env, set PAYMOB_WEBHOOK_ENABLED=true only when ready to receive notifications and provide PAYMOB_HMAC_SECRET and the selected PAYMOB_INTEGRATION_ID. This flag is independent of PAYMOB_ENABLED; receiving notifications does not enable checkout. An absent/false webhook flag returns 404 PAYMENT_WEBHOOK_DISABLED for otherwise valid POST requests, without database access. Invalid enabled configuration fails safely. Default local settings remain disabled.

PAYMOB_OWNER_ID can remain empty during initial setup. If supplied, it must be a positive identifier and must match the signed owner. While unknown, a signature-valid receipt is only an inbox record: it is not proof of a TEST transaction, Auth/Cap support, ownership of a booking or collected funds. The unsigned is_live value is deliberately ignored. Before any future booking mutation, an authenticated Paymob inquiry must establish TEST mode and the expected owner, integration, order, amount and currency, and match a persisted payment attempt. Never auto-configure the trusted owner from an incoming callback.

PaymentEvent stores an internal UUID, a unique hash of the signed canonical event, provider transaction/order/integration/owner identifiers, receivedAt and signedJson. signedJson contains only the verifier's normalized allowlist. The raw request, signature, card fragments, source_data, customer data and unsigned payment flags are not saved. Unknown order IDs are retained for later reconciliation because a callback can arrive before the originating request finishes. There is no booking foreign key or booking mutation at receipt time.

The insert uses PostgreSQL ON CONFLICT (eventKey) DO NOTHING. Concurrent redelivery produces one row; a different signed state of the same transaction produces a separate event. Out-of-order events are retained without applying a booking state transition. The API sends HTTP 200 with {received:true} only after the transaction commits, for both first delivery and duplicates. Storage failures return a generic 500, not an acknowledgement. There is currently no event-processing worker, public inbox read endpoint or automatic cleanup policy.

Files: apps/api/src/routes/paymobWebhookRoutes.ts mounts the callback; controllers/paymobWebhookController.ts checks request shape; services/paymobWebhookService.ts verifies configured identity and inserts the normalized event; config/paymob.ts separates inbox configuration from checkout; prisma/contract.prisma defines PaymentEvent. The additive payment_event_inbox migration creates only the new table, its unique constraint and two lookup indexes; existing booking/seat data is unchanged.

Verification: 173 default tests cover request validation, signature/identity checks, disabled operation, safe errors and data minimization. All 21 PostgreSQL integration tests passed in an isolated database, including migration replay, concurrent redelivery, distinct transaction-state events and unchanged bookings/seats. Compiled JavaScript passed HTTP health, signed receipt and duplicate-storage checks. Migration replay was repeatable; applying the additive migration to development preserved all 18 pre-existing business tables and left the new inbox empty. No real Paymob payment is created. Public HTTPS callback delivery and a real TEST authorization still need verification after the remaining payment flow is implemented.

Official callback behavior and local public-URL requirements: [Paymob transaction callbacks](https://developers.paymob.com/paymob-docs/developers/transaction-callbacks).

## Prepare one payment attempt for a booking

An authenticated passenger can now prepare and retrieve an immutable payment snapshot for their own checkout hold. This feature does not contact Paymob, create an intention/checkout URL, capture funds or confirm a booking. It can be developed/tested without the remaining provider settings. Existing PENDING_PAYMENT holds, expiry cleanup and seat availability are unchanged.

Apply npm run db:migrate, then call:

```http
POST /api/v1/bookings/<bookingId>/payment-attempt
Authorization: Bearer <accessToken>
Content-Type: application/json
Idempotency-Key: <UUID generated once for this booking>

{}
```

Only an empty JSON object is accepted. The booking id must be a UUID, there must be no query parameters, and Idempotency-Key must be one UUID (normalized to lowercase). Frontend prices, currency, ownership, status and expiry are rejected. Keep the same key while retrying a request for the same booking.

A first request returns 201 with Location pointing to GET /api/v1/bookings/<bookingId>/payment-attempt. A retry with the same key returns 200 and the same id, amount, createdAt and expiry. A different key for an already-prepared booking returns 409 PAYMENT_ATTEMPT_EXISTS. Keys are scoped to a booking, so another booking may use the same key without retrieving or changing the first one. A database unique constraint on bookingId enforces one preparation snapshot even when requests arrive concurrently.

The data response contains id, bookingId, status, amountPiastres, currency, expiresAt and createdAt. PREPARED means local preparation only; EXPIRED is derived from the persisted deadline on reads, without writes or a worker. There are no secrets, customer details, idempotency keys or checkout links in this response. These statuses do not represent provider authorization or collection. GET returns 404 PAYMENT_ATTEMPT_NOT_FOUND for an owned booking without an attempt. Other passengers and staff receive the same 404 BOOKING_NOT_FOUND as an unknown booking; staff privileges do not bypass ownership.

The service revalidates the active verified user and unrevoked session inside the transaction. It shares booking creation's User -> Session -> Trip -> Route -> Bus lock order, and re-reads the booking after acquiring the Trip lock. It rejects expired holds, less than one full second remaining, legacy/non-pending bookings, departed/cancelled trips, inactive routes/buses and missing/released seat allocations. Amount and expiry come only from the persisted booking. Zero-cost bookings return 409 PAYMENT_NOT_REQUIRED; this step does not define a free-ticket confirmation path. An existing attempt with a changed amount/deadline returns 409 PAYMENT_ATTEMPT_MISMATCH rather than silently replacing the snapshot. Authentication and deadline times are checked again after waiting for locks.

No database lock remains held after the response, and no network request is performed while holding it. An attempt never extends the booking deadline or protects a seat from normal expiry. A delayed POST after expiry returns 409 BOOKING_EXPIRED, including when its original request had succeeded; GET can still retrieve the expired snapshot. The future provider-initiation/capture flow must revalidate ownership, exact expiry and current allocations under the same Trip lock before any external payment operation. Prepared metadata alone is never permission to collect funds.

PaymentAttempt belongs to Booking through a restrictive foreign key to preserve history. Its amount uses BigInt in PostgreSQL and a safe JSON number bounded by the existing maximum booking total; database checks enforce positive EGP amounts, a deadline after creation and the normalized key shape. The additive booking_payment_attempts migration creates only this table, its unique constraint, expiry index and foreign key. Existing business rows are preserved. No provider transaction IDs are invented or webhook events automatically associated in this step.

Code to read: apps/api/src/schemas/paymentAttemptSchema.ts validates the empty body/key; controllers/paymentAttemptController.ts handles HTTP status and owner context; services/paymentAttemptService.ts applies transaction guards, idempotency and serialization; routes/bookingRoutes.ts mounts the two endpoints under the existing authentication middleware. No new package or environment variable is required. Payment cancellation, direct capture/void and manual confirmation endpoints remain unavailable.

Payment preparation verification: all 178 default tests and all 22 PostgreSQL integration tests passed, plus a targeted re-run of the expanded concurrency/authentication checks. Tests cover same/different idempotency keys in parallel, cross-user/staff ownership, exact BigInt totals above int32, expired/subsecond holds, concurrent expiry/reallocation, stale sessions/accounts, unavailable trip parents, missing allocations and database constraints. Compiled JavaScript passed real HTTP reservation, prepare/retry/read and unchanged-booking-state checks in a separate temporary database. TypeScript, lint, formatting and build passed. All migrations replayed and repeated successfully; applying the additive migration to development preserved all 19 pre-existing tables and left PaymentAttempt empty. Temporary databases were removed; no Paymob request or money movement was performed.

## Durable internal Paymob authorization creation

PaymentAuthorization is the send-once operation associated with a PaymentAttempt. This creation service provides operation metadata to the owned checkout gateway described below. Financial capture/void remains server-only in the reconciliation worker. The default provider stays disabled locally. Tests inject a fake provider; no real Paymob intention or financial operation was performed.

The flow in src/services/paymentAuthorizationService.ts is:

1. Revalidate the database user/session, ownership, current trip/parents, held seats, amount and expiry using the shared withPayableBooking transaction guard. Require an existing matching PaymentAttempt.
2. Commit one REQUESTING operation with its integration/owner scope. Its UUID becomes Paymob special_reference. Unique paymentAttemptId prevents a second operation.
3. Call createAuthorization outside the transaction. The amount, deadline and billing details come from server records; no network request runs while seat/account locks are held. Concurrent callers or a new service instance see the persisted operation and never resend it.
4. Verify the response and revalidate booking eligibility before saving READY, intentionId, orderId and an encrypted checkout URL. A late or otherwise ineligible response stores its references as EXPIRED, without a checkout URL; it never extends the hold or changes the booking/seats. READY means an intention was created, not that funds were authorized, captured or the booking confirmed. EXPIRED closes this creation operation after failed post-response booking/session eligibility; it is not a statement about the provider's financial outcome.

REQUESTING left behind by a process crash and UNKNOWN after a timeout, unexpected failure or invalid response both require reconciliation. FAILED represents a provider-declared pre-send failure. None of these states is automatically retried, including FAILED. A changed provider integration/owner blocks reuse. Database write failures propagate and may leave REQUESTING; they must never trigger a new POST. Provider reference uniqueness and restrictive relations preserve correlation history.

Checkout URLs contain a client secret, so they are encrypted using AES-256-GCM, a fresh nonce and authenticated operation-id binding. PAYMENT_CHECKOUT_SECRET is an independent random 32-byte hexadecimal key in apps/api/.env; keep it out of Git and preserve it while stored links are needed. Generate it with the same crypto.randomBytes(32) approach as the other local secrets. payment:check validates this key when Paymob is enabled. Changing the key requires a deliberate migration/rotation plan for stored ciphertext. The internal service returns only operation metadata, never a checkout URL, encrypted payload, customer data or key. There is no decryption/read route.

The local .env received a generated key without changing any provider activation flag. The .env.example documents the setting with a placeholder only. Receiving webhooks remains independent of sending or exposing checkout. Known-order inquiry and capture/void reconciliation with safe seat retention are described below. Reference recovery and gated owned checkout exposure are described below; merchant verification is still required before passengers can pay. The existing-owner bootstrap and account Auth/Cap verification remain prerequisites to operational activation.

Paymob documents special_reference as an order correlation identifier and returns intention/order IDs plus a client secret: [Create Intention](https://developers.paymob.com/paymob-docs/developers/intention-apis/create-intention). Its official [Auth/Cap reference](https://github.com/PaymobAccept/Paymob-AI-Integration-Skill/blob/main/skills/paymob-integration/references/advanced-features.md) notes account-specific authorization flags; actual account behavior has not been remotely verified.

Authorization-operation verification: all 181 default tests and all 30 PostgreSQL tests passed. The new internal-service group also passed all eight tests independently. Coverage includes committed-before-send visibility, concurrent/new-instance deduplication, unknown/known failure handling, encrypted storage and operation binding, provider-scope changes, ownership/session checks, preparation mismatch, late response plus seat reallocation, and PostgreSQL uniqueness/check/restrict constraints. TypeScript, lint, formatting and build passed. Full migration replay and repeat application passed in isolated temporary databases, which were removed. Applying the additive six-operation migration to development preserved counts and complete-row hashes for all 20 pre-existing tables; PaymentAuthorization remained empty. No Paymob request or financial operation was made.

## Verified TEST settlement and booking lifecycle

Known Paymob orders now have an internal reconciliation service and an optional payment worker. Signed PaymentEvent rows are only hints for original authorization transaction IDs. No browser redirect, HMAC callback, provider POST acknowledgement or supplied capture amount can confirm a booking. The worker queries the original transaction through authenticated Paymob inquiry and independently checks transaction ID, saved order, owner, integration, TEST mode, EGP and the exact server-side PaymentAttempt amount. Callback ordering and unsigned captured/live flags do not determine the result.

A PaymentSettlement belongs to exactly one PaymentAuthorization and pins one unique transaction ID. Its immutable kind is CAPTURE or VOID. REQUESTED is committed before its single permitted provider POST; UNKNOWN means the operation may have been sent and must be queried. Neither state permits resending, including after a crash before the first caller could actually send. SUCCEEDED is a verified result for that operation; REVIEW requires operator investigation. There is deliberately no automatic money-POST retry and no operator retry/refund endpoint in this batch. A crash between the durable claim and the network send can require manual recovery rather than risking a duplicate charge.

For a verified successful authorization, the service locks User -> Trip -> Route -> Bus, rereads the booking/snapshot/settlement and checks allocation, account, departure, parents and remaining hold time. If eligible, it commits both PAYMENT_PROCESSING and the CAPTURE claim, releases the database locks and sends the exact amount. If ineligible or expired, it commits a VOID claim and releases only that booking's allocations; it never reclaims seats allocated to a newer booking. Session expiry/logout does not prevent reconciliation of an already-authorized transaction; account activity is checked before the capture claim.

PAYMENT_PROCESSING is excluded from expiry cleanup and remains unavailable in seat listing and new reservations even after its original expiresAt. It changes to CONFIRMED only when inquiry verifies a successful, non-pending, unrefunded/unvoided full capture on the pinned authorization, with all seats still held and the trip scheduled. A timeout or stale zero-captured inquiry keeps the booking processing and triggers later inquiry, not another capture. Verified zero-captured void releases the booking; a void observed after a capture claim is marked REVIEW rather than reporting a successful capture. Unexpected/partial capture, inconsistent money flags or an invalid allocation is not auto-confirmed/refunded: remaining owned allocations are protected for review without restoring released seats. REVIEW operations stop automatic processing and require operator investigation. Confirmation and review must not be interpreted as an agreed operator cancellation/refund policy.

The existing owner and administrator booking reads expose the new booking statuses and paymentRequired=false for processing/confirmed bookings. Passenger cancellation and capture/void mutation routes remain unavailable. Gated checkout URL exposure is described below; tickets and payment emails remain outstanding. No real provider request was sent during implementation; financial tests use an injected fake transport/provider and real isolated PostgreSQL databases. The local provider remains disabled.

To enable this worker later, deliberately set PAYMOB_RECONCILIATION_ENABLED=true in apps/api/.env after configuring and verifying the strict TEST provider settings and account Auth/Cap capability. Default false/absent exits before database or network access. Run npm run payment:reconcile for one bounded batch or npm run payment:worker for polling. The worker checks up to 20 due authorizations, including uncertain creations without an order ID per batch (maximum supported argument 100), considers at most 20 recent receipts/five original transaction candidates, polls unfinished operations every 30 seconds, and reschedules waiting/mismatched/unavailable work to avoid starvation. Concurrent workers may repeat inquiry but cannot acquire a second capture/void send claim. One-shot failures/retries/review/mismatches use a nonzero exit and safe aggregate counts; logs never include provider responses, checkout links, transaction/customer details or credentials. No worker has been left running.

Boundaries before passenger checkout activation: verify reference-inquiry behavior against this account; verify account-specific original authorization/capture/void shapes (including original captured_amount aggregation); verify an original authorization callback or a safe inquiry fallback; establish the configured owner without guessing; configure public HTTPS callbacks/return handling; agree operator cancellation/refund handling. Unresolved references and unrelated receipts are retained; missing or unverifiable inquiry results never justify another creation request. Multiple authorization transactions on one order are not automatically collected: only one pinned original transaction is supported, and additional authorizations require provider/account review. Refund/reversal handling after a terminal successful booking remains a later feature; terminal rows are not reopened by stale callbacks.

Provider references: [authenticated transaction inquiry](https://developers.paymob.com/paymob-docs/developers/transaction-inquiry-apis/by-transaction-id), [Auth/Cap](https://developers.paymob.com/paymob-docs/payments-and-features/core-features/auth-cap), and [capture](https://developers.paymob.com/paymob-docs/payments-and-features/managing-payments/capture). Actual merchant behavior still needs a controlled TEST end-to-end verification before exposing checkout.

Settlement lifecycle verification: all 184 default tests and all 44 PostgreSQL tests passed. The 14-test reconciliation group also passed independently. Tests cover signed receipt deduplication, concurrent workers, exact inquiry matching, committed-before-send settlement/booking state, stale acknowledgements, timeout after remote capture, restart without replay, original hold expiry during capture, HTTP seat unavailability, confirmed booking reads, late authorization with a replacement booking, uncertain void, inconsistent/partial/unexpected capture, missing allocations, suspension, out-of-order candidates and fair rescheduling on inquiry outage. TypeScript, lint, formatting and build passed; the compiled JavaScript worker exited safely while disabled. All migrations replayed and repeated in isolated databases, then those databases were removed. The 12-operation widening/additive development migration preserved original row values/counts across all 21 pre-existing tables (excluding only the two intentionally added authorization scheduling columns from the comparison); PaymentSettlement remained empty. No provider request or money operation was sent, and no worker was left running.

## Recovering uncertain payment creation

If Paymob creates an intention but the response is lost, the saved operation UUID is already its special_reference. The opt-in payment worker now queries /api/ecommerce/orders/transaction_inquiry using merchant_order_id and an authenticated API token. This is a read-only POST, not a new payment request. It validates the returned order.merchant_order_id against that exact UUID, plus the TEST transaction shape, integration, owner, EGP and the saved PaymentAttempt amount. The provider adapter returns only normalized fields, never the raw customer/card data or token.

UNKNOWN creation is eligible immediately; REQUESTING waits at least 30 seconds to allow an in-flight creation request to finish. A matching inquiry saves only its order ID using a compare-and-set that cannot replace a concurrently saved order. The operation remains UNKNOWN with no checkout URL; an intention ID is not fabricated. A two-operation widening/additive migration permits an order ID without an intention ID, while still rejecting an intention ID without its order and retaining the stricter READY checkout constraint. No table or booking history is deleted.

A recovered original authorization can then follow the existing authenticated by-transaction-ID checks and durable capture/void lifecycle. The same reference lookup supplies a candidate when an order is known but its authorization callback was not received. The worker does not guess a parent from a capture/refund child; the reference endpoint returns only the latest transaction, not every authorization. Multiple authorizations remain a manual-review limitation.

A missing transaction, timeout, malformed response, wrong reference or mismatched amount/account cannot confirm a booking or cause another creation POST. Work is rescheduled for inquiry. A created intention with no transaction yet cannot be recovered through this transaction endpoint; its missing checkout link cannot be reconstructed here. An expired hold with a verified authorization is voided through the existing send-once claim, without reclaiming another passenger's seat. No extra worker, public route or activation flag is introduced. Account-specific behavior and Auth/Cap still require TEST merchant verification before enabling the checkout gateway below.

Provider sources: [reference inquiry](https://developers.paymob.com/paymob-docs/developers/transaction-inquiry-apis/transaction-inquiry/by-order-id-or-reference) and the linked [official Postman collection](https://github.com/PaymobAccept/API-Postman-Collections/blob/main/Transaction%20Inquiry%20API.postman_collection.json). No real provider or money request was sent while implementing this feature.

Reference-recovery verification: 187 default tests and all 49 PostgreSQL tests passed, including the 19-test reconciliation group independently. Coverage includes a lost creation response with no resend, six concurrent recoveries with one capture, stale/fresh REQUESTING handling, worker-batch selection, wrong-reference/account/amount rejection, unavailable inquiry, missing callbacks, child-transaction rejection, and late authorization after seat reallocation. TypeScript, lint, formatting and build passed. Migrations replayed and repeated in an isolated database that was removed afterward; the development migration applied/repeated without changing row counts or row values across all 22 existing tables. No real Paymob requests were made and payment activation flags remain unchanged.

## Owned TEST checkout and payment status

The API now provides two authenticated, owner-only endpoints. Administrators do not bypass booking ownership. Checkout creation remains disabled by default: no local activation flag was changed and no real Paymob request was sent during implementation. These endpoints reuse existing tables; no database migration or new dependency is required.

| Method | Path                          | Behavior                                                                                                        |
| ------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| POST   | /api/v1/bookings/:id/checkout | Start or resume the same send-once authorization and return an eligible checkout URL, or null while unresolved. |
| GET    | /api/v1/bookings/:id/payment  | Read the current booking/payment snapshot without a provider request, decryption or financial mutation.         |

Both require Authorization: Bearer access-token and return Cache-Control: no-store. POST accepts an empty JSON object with Content-Type: application/json; query parameters and fields such as amount, currency, userId, success, returnUrl or status are rejected. The existing payment-attempt endpoint must prepare the booking first. Its persisted one-per-booking operation provides creation idempotency: checkout does not need a second Idempotency-Key header. Repeated calls cannot create another intention, including after a timeout. POST returns HTTP 200 with Location pointing to the owned payment-status URL; it does not redirect the browser. Checkout has a separate limit of 20 requests per minute/IP, and payment reads allow 120 per minute/IP. Both run after authentication.

The response data contains bookingId, bookingStatus, paymentStatus, amountPiastres, currency, expiresAt and serverTime. Only POST adds checkoutUrl, either a usable link or null. GET never returns the link, ciphertext, provider/account references, raw callback, card/customer details or secrets. The amount comes from the server booking, not submitted prices. Compare expiresAt against serverTime for the future frontend countdown; this does not extend the hold.

| paymentStatus          | Meaning                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| NOT_STARTED / PREPARED | No provider operation, or only the local payment snapshot exists.                                               |
| INITIALIZING           | The persisted creation request is still unresolved.                                                             |
| AWAITING_PAYMENT       | A checkout was created; no collection is confirmed.                                                             |
| UNKNOWN                | Creation or stored evidence cannot establish the outcome; never start a new operation blindly.                  |
| PROCESSING             | A durable capture/void operation is unresolved or the booking is processing; retain protected allocations.      |
| PAID                   | The booking is CONFIRMED and its completed CAPTURE settlement succeeded for the exact matching snapshot amount. |
| VOIDED                 | The expired booking has a verified successful authorization void. This is not a refund after collection.        |
| FAILED / EXPIRED       | Creation failed before sending, or the checkout/booking expired; no new operation is automatically created.     |
| REVIEW                 | Financial evidence needs operator review; the API must not claim payment success.                               |

bookingStatus and paymentStatus are separate. For example an expired hold may still have UNKNOWN authorization creation, and a confirmed booking can remain PAID after its original hold deadline. Browser-supplied success/transaction query parameters are never accepted as evidence. The future Paymob return page should ignore them for confirmation and poll the authenticated GET endpoint, with a bounded interval/backoff; only webhook receipt plus authenticated server inquiry/reconciliation can finalize payment. No public capture, void, refund, cancellation or GET redirect handler is added.

Before returning a checkout URL, the service rechecks the current user/session, ownership, pending status, hold/departure, active trip parents, exact attempt amount/deadline and all seat allocations under the existing User -> Session -> Trip -> Route -> Bus lock order. It checks again after provider I/O and before decryption. Provider calls run outside the transaction. A processing/confirmed/expired booking, completed settlement, revoked session or released allocation cannot resume checkout. The encrypted link must decrypt for the same operation and match the fixed Egypt HTTPS checkout path, TEST keys and currently configured public key. Corruption and malformed hosts produce generic errors without exposing decrypted values. No checkout is reconstructed for recovered references without a saved encrypted URL.

Operational opt-in is PAYMOB_CHECKOUT_ENABLED=true in apps/api/.env. Keep it false until the selected TEST card integration's Auth/Cap behavior has been verified, the operator cancellation/refund policy is agreed, and the intended HTTPS callback/return URLs are reachable. The gate additionally requires strict PAYMOB_ENABLED settings, PAYMOB_RECONCILIATION_ENABLED=true and an enabled owner-scoped webhook. The payment worker must actually be running; configuration flags alone do not prove worker health or merchant capability. payment:check validates these local prerequisites without contacting Paymob. Missing/false checkout opt-in returns a fixed safe HTTP 503 PAYMENT_UNAVAILABLE before database/provider access; payment-status reads remain available even when checkout is disabled. Invalid enabled configuration is a concealed server error.

Future passenger flow: create the seat hold; prepare payment with the original UUID Idempotency-Key; POST checkout with {}; navigate to the returned checkoutUrl only while the booking is eligible; after returning, read GET payment until a durable terminal result. If checkoutUrl is null, read status rather than creating a new booking/payment automatically. Render expired/review/unknown states distinctly and never claim a ticket from AWAITING_PAYMENT alone. This backend batch does not create the frontend return page, enable paid bookings, implement refunds or resolve the existing multiple-authorization-per-order limitation.

Owned-checkout verification: 194 default Node tests and all 58 PostgreSQL tests passed; the nine-test checkout group also passed independently. Coverage includes owner/admin isolation, six concurrent starts with one provider creation, preparation prerequisites, no-store responses, encrypted-link reuse, ambiguous creation without resend, expiry/reallocation during I/O, revoked sessions, processing/paid/voided/review reads, no provider side effects from GET, malformed ciphertext/hosts and changed public keys. The local configuration check is exercised with an invalid database URL and never uses the network. TypeScript, lint, formatting and build passed. The compiled JavaScript app returned health 200 and safe checkout-disabled 503 with no database/provider access. All migrations replayed/repeated in an isolated database that was removed afterward. No new migration/dependency, development-data write, real provider request or payment activation was introduced by this feature.

## Administrator payment lists and details

GET /api/v1/admin/payments and GET /api/v1/admin/payments/:id are restricted to current, active, verified ADMIN or SUPER_ADMIN sessions. The id is the PaymentAttempt UUID, not a booking, authorization, order or transaction ID. Each record represents the one local payment attempt for a booking; prepared attempts with no provider operation are included. Bookings without a PaymentAttempt remain in administrator booking lists. The existing passenger payment/checkout endpoints retain owner-only access; staff roles do not bypass that scope. All responses use Cache-Control: no-store.

List query parameters are strict and combine with AND:

| Filter                                | Meaning                                                                                                                                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| limit / offset                        | Default 20/0; bounds 1-100 and 0-100000. Results order by PaymentAttempt.createdAt descending, then UUID descending.                                                                                |
| bookingId / tripId / userId           | Exact UUIDs.                                                                                                                                                                                        |
| reference / email                     | Exact booking reference or customer email; reference is normalized uppercase and email lowercase.                                                                                                   |
| orderId / intentionId / transactionId | Exact provider references; positive safe numeric IDs, or a TEST pi_test_ intention ID.                                                                                                              |
| authorizationStatus                   | REQUESTING, READY, UNKNOWN, FAILED or EXPIRED.                                                                                                                                                      |
| settlementStatus                      | REQUESTED, UNKNOWN, SUCCEEDED or REVIEW.                                                                                                                                                            |
| settlementKind                        | CAPTURE or VOID.                                                                                                                                                                                    |
| createdDate                           | PaymentAttempt creation date YYYY-MM-DD in Africa/Cairo, years 2000-9998. Uses an inclusive day start and exclusive next-day start, including DST. This is neither travel date nor collection date. |

For example, GET /api/v1/admin/payments?settlementStatus=REVIEW&limit=20 finds durable review settlements, while authorizationStatus=UNKNOWN finds uncertain creation operations. orderId and transactionId are distinct identifiers. The response is {data: [...], pagination: {limit, offset}}; it does not claim a total count. The detail endpoint accepts no query parameters and returns 404 PAYMENT_NOT_FOUND for a missing attempt. Unknown/repeated fields, malformed references, unsupported statuses, invalid dates or pagination produce 400 VALIDATION_ERROR.

Every record explicitly returns the attempt id, bookingId, booking reference, tripId, minimal customer {id,name,email}, effective bookingStatus, shared paymentStatus, requiresReview, amountPiastres, bookingTotalPiastres, currency, attempt/booking expiry, creation time and serverTime. Keeping the attempt amount separate from bookingTotalPiastres exposes snapshot inconsistencies without silently replacing financial history. Authorization and settlement blocks are null until present; they expose only operation state, safe provider/account references, reconciliation completion/scheduling and timestamps. Settlement also exposes kind, transactionId and integer-piastre amount. All timestamps are ISO UTC.

requiresReview is true only for a durable REVIEW settlement. An UNKNOWN operation is unresolved and scheduled for inquiry; it is not automatically declared a failed or paid transaction. A completed capture may leave authorization.status=EXPIRED because its checkout is closed while paymentStatus=PAID and bookingStatus=CONFIRMED. READY means a checkout exists, not that money was collected. The shared serializer checks the same matching snapshot and settlement evidence used by passenger payment reads, so operator and passenger views agree. There is deliberately no derived paymentStatus list filter: use the named persisted authorization/settlement filters rather than guessing equivalence between them.

The query projects only the customer identity needed for an operator and excludes encryptedCheckoutUrl from the authorization selection. Explicit response serialization excludes all checkout links/ciphertexts, idempotency keys, raw callbacks, card data, password hashes, tokens, sessions and credentials. List/detail perform no decryption, provider request, cleanup, reconciliation, retry, capture, void or refund. No financial mutation or raw callback route is exposed under /admin/payments. REVIEW work still requires a future explicit recovery policy; viewing it does not resolve it.

This feature adds one composite index on PaymentAttempt(createdAt,id), with no table/row deletion or new dependency. Existing strict TEST checkout flags remain unchanged and disabled locally. Actual merchant Auth/Cap verification and the operator cancellation/refund policy are still required before enabling checkout.

Administrator-payment verification: all 200 Node tests and all 66 PostgreSQL tests passed; the eight-test operator-payment group passed independently. Tests cover live-role/session restrictions, combined relation/reference/state filters, nullable preparation/authorization states, exact references, Cairo 25-hour DST boundaries, tied-time pagination, consistency with passenger status, secret exclusion and unchanged financial/allocation/event history across successful/invalid reads and forbidden mutation attempts. TypeScript, lint, formatting and build passed. Compiled JavaScript returned 401/403/200 for anonymous/passenger/staff access using injected fixtures without database/provider calls. All migrations replayed/repeated in a temporary database that was removed. The one-index development migration applied/repeated and the index was verified; row values/counts across all 22 tables were unchanged. No real Paymob request, financial operation or activation flag change occurred.

## Confirmed-booking tickets and email

A successful, independently verified full capture now commits Booking.CONFIRMED, CAPTURE/SUCCEEDED, completed authorization and one Ticket **in the same database transaction**. The bookingId unique constraint and existing trip/settlement locks prevent duplicate ticket issuance during concurrent or repeated reconciliation. No email is sent inside the payment transaction. Pending, unknown, voided or review payments do not issue tickets. This adds one table/index/constraints; it does not change old financial rows or fabricate tickets for old/manual confirmed fixtures.

Authenticated passengers read their own ticket with:

```http
GET /api/v1/bookings/<booking-uuid>/ticket
Authorization: Bearer <access-token>
```

The API returns data with ticket id, bookingId, booking reference, issuedAt, EGP totalPiastres, passenger names/seat numbers, bilingual origin/destination city/station labels, UTC departure/arrival and qr.payload/qr.imageDataUrl (PNG). The frontend can display the PNG data URL directly. Times in the email use Africa/Cairo. There is one ticket for the entire booking, including all its passengers. No PDF is generated in this feature.

Reads require current authenticated ownership, including when the caller has an administrator role. Missing/other-owner/unissued/unsafe tickets return the same 404 TICKET_NOT_FOUND. Only CONFIRMED bookings with matching successful capture evidence, complete seat allocations and a scheduled trip are returned. Historical journeys can still be read; expired hold timestamps do not invalidate a confirmed booking. Query parameters and ticket creation/update/delete routes are unavailable. Responses use Cache-Control: no-store; reads are bounded to 60 requests per minute/IP after authentication. Reading a ticket does not query Paymob, send mail or alter the booking.

QR payload is BUS-TICKET:v1:<ticket-uuid>; it contains no passenger name, phone, email, provider reference or checkout URL. It is an opaque identifier, **not a secret bearer credential, offline payment proof or check-in authorization**. There is no public QR lookup. The future staff scanner must authenticate, look up current booking/payment/trip state and implement check-in/replay rules. Scanning the current QR with an ordinary phone displays its text identifier.

The existing worker processes both account and ticket email queues:

```powershell
npm run email:worker
# Or process one batch of each queue:
npm run email:flush
```

Ticket itself stores delivery metadata: sentAt, discardedAt, attempts and nextAttemptAt. It is committed before SMTP work, so failed mail cannot undo a paid booking. Each batch handles up to 20 due tickets. Workers lock and re-read each ticket to avoid concurrent duplicate delivery. Failures back off from 30 seconds, with at most five attempts. Suspended/unverified customers, invalid/unpaid/cancelled-trip bookings and journeys that already departed are discarded from email delivery; the ticket row is retained. Exhausted/discarded mail has no automatic resend endpoint. The owner can still retrieve an otherwise valid ticket through the API.

Arabic/English email includes the reference, stations, Cairo dates/times, passengers/seats and total, with the QR as a PNG attachment. Templates use plain text, so passenger input is never inserted into HTML. Nodemailer uses the existing SMTP settings; local development can receive it in Mailpit. No new secret or environment flag is required. A stable Message-ID helps identify a retry, but SMTP delivery is **at least once**: a crash after SMTP acceptance and before sentAt commits can deliver a duplicate. The Ticket is never duplicated by this situation.

Apply npm run db:migrate before starting the updated API/worker. QR generation uses the [qrcode library's server PNG API](https://github.com/soldair/node-qrcode); TypeScript definitions are a development dependency. Tests exercise real isolated PostgreSQL with a fake payment provider and injected mail sender, including concurrent confirmation, protected reads, no ticket for unresolved payment, retry/backoff, concurrent workers, exhausted delivery and departed/suspended recipients. They do not claim a real Paymob transaction or external email delivery. Checkout/payment configuration remains disabled until merchant verification and operator policy work are complete. Reminder emails, operator cancellations/refunds and staff QR check-in remain separate features.

## Departure reminders

The existing npm run email:worker (or email:flush for one batch) now also handles one reminder per Ticket. No new dependency, environment setting or API route is required. Apply npm run db:migrate before running the updated worker. Keep the worker running to send reminders automatically; no desktop automation or external cron job was created.

A reminder becomes due when the scheduled departure is **24 elapsed hours away**, including the exact boundary. The calculation uses UTC instants, not local calendar-day subtraction, so clock changes do not turn it into a 23/25-hour reminder. Email displays the departure with Africa/Cairo local time. Subject/body say the trip is within the next 24 hours rather than falsely promising exactly 24 hours after a delayed run.

Only tickets issued at least 24 hours before departure qualify. If confirmation/ticket issuance happens inside the final 24 hours, the normal ticket email is sufficient and its redundant reminder is discarded. If the worker was stopped at the due time, it can catch up before departure, but not at or after departure. Existing tickets receive the new metadata defaults and are evaluated by the same eligibility rules; no financial row or ticket identity is recreated.

Ticket has four **independent** reminder fields:

| Field                 | Meaning                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| reminderSentAt        | SMTP accepted the reminder and the worker committed success                                        |
| reminderDiscardedAt   | Reminder is no longer eligible, or delivery attempts were exhausted                                |
| reminderAttempts      | Number of reminder send attempts, constrained to 0..5                                              |
| reminderNextAttemptAt | Earliest time another attempt may run; initially now, with the departure window checked separately |

Each batch selects at most 20 due records through booking/trip relations and the reminder index. It locks and re-reads each Ticket before sending, rechecks the clock after taking the lock, and validates current confirmed/full-capture payment evidence, active seat allocations, scheduled trip, and an active verified recipient. Cancelled/departed trips, unconfirmed/unresolved/review payments, invalid allocations and suspended/unverified accounts are discarded without SMTP. A trip moved outside the window would wait for its new window. These checks reuse ticket validation but do not generate another QR PNG for the reminder.

The message uses the recipient's current Arabic/English preference and email and includes booking reference, stations, departure time and passenger seat numbers in plain text. It does not attach another QR or claim another payment. A separate stable Message-ID, departure-reminder-<ticket-id>, distinguishes it from the original ticket. Confirmation-mail fields, ticket id, booking status, payment state and seat ownership remain unchanged when reminders succeed or fail. A failed original ticket email does not automatically block an otherwise eligible reminder.

Concurrent/restarted workers skip committed reminderSentAt/discardedAt records. SMTP failures back off from 30 seconds and stop after five attempts; each retry rechecks eligibility and cannot send after departure. The same at-least-once SMTP limit applies as for ticket email: a crash after SMTP acceptance but before the database success commit can duplicate the message. Stable Message-ID is not a guarantee of recipient-side deduplication. There is no public resend action or additional reminder history table.

Tests cover the exact 24-hour and departure boundaries, offset changes, late confirmations, catch-up, multiple real PostgreSQL workers, restart-safe state, failure backoff/exhaustion, unsafe payments/seats/accounts, and unchanged ticket/payment state. Delivery tests inject a sender; they do not send external mail or perform a real Paymob transaction. Payment gates remain unchanged.
