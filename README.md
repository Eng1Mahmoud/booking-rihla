# Bus Booking Platform

A bus booking application for Egypt, built in focused feature batches with explanations.

## Current feature: Physical bus seat layouts

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

The reservation MVP is complete: authenticated seat reservations, server-priced totals, passenger ownership and current availability, without payment or passenger cancellation. Bus types and amenities are now implemented. Physical seat layouts and stale-selection protection are complete. Next add recurring/bulk trip creation with validation and a preview, then continue the remaining operator APIs.

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

Apply npm run db:migrate before using this feature. Bus stores id (UUID), plateNumber (unique text), seatCount (integer 1-100), and isActive (boolean, default true). BusSeat stores its own UUID, busId, and number. Plate input is trimmed, internal whitespace collapsed, and letters uppercased before persistence. Optional busTypeId and many-to-many amenities are implemented below; physical seat layouts are configured through the dedicated layout API below.

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
    "layout": null,
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

The reusable middlewares/requireRole.ts accepts explicit allowed roles: management currently permits ADMIN and SUPER_ADMIN. Future super-admin-only administrator management and refunds will explicitly allow only SUPER_ADMIN. Those administrator-management operations remain later work. Reservation endpoints now enforce passenger ownership separately, including for administrator accounts.

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

POST accepts tripId, contactPhone, passengers and optional layoutId. For a configured map, layoutId must equal the displayed layout.id; omission or a stale id returns 409 SEAT_LAYOUT_CHANGED. Unconfigured numbered-seat buses still accept an omitted/null layoutId. Replace UUID placeholders with a trip and its seat ids from GET /api/v1/trips/:id/seats:

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

Bookings return reference/status, paymentRequired: false, currency, contact phone, server prices, timestamps, bilingual trip route/station/city information and ordered passenger seats. User ids, password data and bus plates are excluded. Listing defaults to twenty rows, accepts limits 1-100 and offsets 0-100000, and rejects other query fields. UUID detail lookups return the same 404 for a missing reservation or another account's reservation, including when the caller is an administrator. Past trips remain readable through the owner's booking. Operator booking lookup will use separate authorized APIs later.

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

Bus management responses now contain busTypeId, busType (id/code/nameAr/nameEn or null), and a flat amenities array sorted by code/UUID. Passenger search and details expose only id, seatCount, busType and amenities under bus. Raw BusAmenity links and plate numbers stay private. Related labels are loaded with the existing included relations, without per-trip lookup loops. Seat availability now additionally includes layout, described below; the existing numbered seats and count fields stay available.

BusType is a one-to-many relation: one bus may have one type, and many buses can share it. Amenities use the explicit BusAmenity join table because a bus can offer several amenities and an amenity can belong to several buses. UNIQUE(busId, amenityId) prevents duplicate links. Deleting a bus cascades only its links; deleting a type or amenity that is still assigned returns 409 BUS_TYPE_IN_USE or AMENITY_IN_USE. Duplicate normalized codes return 409 BUS_TYPE_CODE_EXISTS or AMENITY_CODE_EXISTS. Missing resource or assignment ids return 404 BUS_TYPE_NOT_FOUND or AMENITY_NOT_FOUND.

Creation saves the bus, seats and amenity links in one transaction. Updating locks the bus and validates all catalog references before making changes; seat resizing, scalar changes and complete amenity-set replacement commit together. Bad references or conflicting plates roll back the whole request. Parallel replacements serialize, so their sets cannot merge accidentally. Parent catalog rows are locked against deletion/definition changes during assignment.

A bus with any reservation, including a past one, rejects actual type or amenity-set changes with 409 BUS_HAS_BOOKINGS. Updating the code or names of a type/amenity used by a reserved bus returns 409 BUS_TYPE_HAS_BOOKINGS or AMENITY_HAS_BOOKINGS. Identical assignments and identical labels remain allowed. The first reservation locks its type and amenities while holding the bus lock, so concurrent definition edits or assignment changes either finish before reservation or are refused after it. This conservative rule preserves the advertised service until a later feature supports per-departure historical metadata. Existing seat-capacity and booked-trip protections remain in place; passenger cancellation stays unavailable.

Read schemas/fleetMetadataSchema.ts for common validation, services/busTypeService.ts and services/amenityService.ts for separate catalog behavior, and services/busService.ts for atomic assignments. Corresponding controllers and routers follow the existing structure. utils/busMetadata.ts produces the flat public labels used by trip search/details. These paths are under apps/api/src. Tests cover admin authorization, CRUD, code uniqueness, invalid references, clearing/preserving assignments, atomic rollback, simultaneous set replacements, public projections, default null/empty metadata and reservation races.

Fleet verification: all eleven migrations applied to an empty temporary database, with zero applied on a second run. All thirteen PostgreSQL integration tests passed there. A compiled JavaScript HTTP smoke test created metadata through protected APIs, assigned it to a bus, checked public search/details without plate leakage, created a reservation and verified metadata mutation/deletion guards. Fixtures and the temporary database were removed. The 124 default tests, type checks, lint and build pass; existing development catalog data was preserved with no extra types, amenities, links, users or reservations left behind.

## Physical seat layouts

Apply npm run db:migrate. This additive migration creates BusLayout and BusLayoutCell without replacing BusSeat records or changing bookings. Existing buses have no configured layout. No default arrangement is invented, and no new dependency or environment variable is needed.

A layout is a single-deck grid with the vehicle front at the top. Coordinates start at zero. Row zero is the front cabin; later rows run toward the rear. Columns run from the vehicle's left to its right. The frontend must preserve that physical orientation even in Arabic: render the map grid with dir="ltr" and localize its labels separately rather than mirroring seat positions. Seat art, selection styling and the passenger/admin UI will be built in the later frontend phases; this feature provides their data and enforcement.

| Kind   | Meaning                                                |
| ------ | ------------------------------------------------------ |
| SEAT   | An existing BusSeat id, with its unchanged seat number |
| AISLE  | A walking aisle cell                                   |
| DRIVER | Driver location in a front corner                      |
| DOOR   | An entrance/exit on an outer column                    |
| EMPTY  | A deliberately unused part of the grid                 |

For example, a two-plus-two map may be drawn as:

```text
Front
Driver   Empty   Aisle   Empty   Door
Seat 1   Seat 2  Aisle   Seat 3  Seat 4
Seat 5   Seat 6  Aisle   Seat 7  Seat 8
Rear
```

The administrator supplies the actual arrangement for each bus. Different grids can represent 2+2, 2+1, a full rear bench, different door locations and a left/right driver. The current scope uses uniform grid cells and one deck.

### Management endpoints

All layout operations inherit the bus router's ADMIN/SUPER_ADMIN Bearer checks and no-store responses. They require a bus UUID and reject query parameters.

| Method | Path                     | Behavior                                                          |
| ------ | ------------------------ | ----------------------------------------------------------------- |
| GET    | /api/v1/buses/:id/layout | Read a configured map, or data: null for a known unconfigured bus |
| PUT    | /api/v1/buses/:id/layout | Atomically replace the complete map; return 200                   |
| DELETE | /api/v1/buses/:id/layout | Remove an unreserved map, preserving seats; return idempotent 204 |

An absent bus returns 404 BUS_NOT_FOUND. PUT requires JSON, rowCount (2-51), columnCount (3-8) and the entire cells array, including empty cells. There must be exactly one cell per coordinate within bounds, 1-100 distinct seats behind the front cabin, one driver in either front corner, 1-3 doors on outer columns and at least one aisle cell. A SEAT cell must include seatId; other cells omit it or use null. Every current seat on that bus must appear exactly once. Foreign-bus, missing or unknown seats return 400 INVALID_LAYOUT_SEATS; invalid grid/body structure returns 400 VALIDATION_ERROR. Unknown properties such as caller-supplied seat numbers and availability are rejected.

Example PUT body for a four-seat bus (replace each UUID with that bus's existing seat id):

```json
{
  "rowCount": 2,
  "columnCount": 5,
  "cells": [
    { "row": 0, "column": 0, "kind": "DRIVER" },
    { "row": 0, "column": 1, "kind": "EMPTY" },
    { "row": 0, "column": 2, "kind": "AISLE" },
    { "row": 0, "column": 3, "kind": "EMPTY" },
    { "row": 0, "column": 4, "kind": "DOOR" },
    { "row": 1, "column": 0, "kind": "SEAT", "seatId": "SEAT_1_UUID" },
    { "row": 1, "column": 1, "kind": "SEAT", "seatId": "SEAT_2_UUID" },
    { "row": 1, "column": 2, "kind": "AISLE" },
    { "row": 1, "column": 3, "kind": "SEAT", "seatId": "SEAT_3_UUID" },
    { "row": 1, "column": 4, "kind": "SEAT", "seatId": "SEAT_4_UUID" }
  ]
}
```

Reads return id, rowCount, columnCount, front: TOP, columnDirection: VEHICLE_LEFT_TO_RIGHT and cells sorted by row/column. Each cell contains kind and seat: null or { id, number }. Management reads do not label bus seats available, because availability belongs to a particular departure. The layout id identifies the exact arrangement and is not a BusSeat id. Actual changes create a new layout identity; submitting the identical grid in a different array order is a no-op and preserves its identity. Physical seat ids/numbers always remain unchanged.

### Passenger selection and booking

GET /api/v1/trips/:id/seats now includes layout with the same geometry and an isAvailable flag inside each cell's seat. Existing seats, totalSeats and availableSeats remain. The geometry, current bus and trip-specific allocations are read in one snapshot; public output excludes plates and passenger/booking details. The same physical map can show a reserved seat on one departure and an available seat on another. Unconfigured buses return layout: null and their existing numbered seats; a client should not claim physical window/aisle positions for them.

When layout is present, submit its id with the reservation:

```json
{
  "tripId": "TRIP_UUID",
  "layoutId": "LAYOUT_ID_FROM_THE_SEAT_RESPONSE",
  "contactPhone": "+201012345678",
  "passengers": [{ "seatId": "CHOSEN_SEAT_UUID", "name": "Passenger name" }]
}
```

The booking transaction compares layoutId with the current map while holding the bus lock. A changed, removed, recreated, wrong or omitted layout identity for a configured map returns 409 SEAT_LAYOUT_CHANGED before saving any booking. Refresh the map and ask the passenger to confirm the seat again. For an unconfigured bus, omission/null remains compatible; a non-null stale id is rejected. Layout identity is selection consistency data, not authentication, ownership or a seat hold; occupied seats still return SEAT_UNAVAILABLE. Passenger cancellation remains unavailable.

### Persistence and reservation safeguards

BusLayout stores one grid per bus; BusLayoutCell stores its coordinates, kind and optional BusSeat reference. PostgreSQL enforces dimension/coordinate ranges, allowed kinds, the seat/null rule, unique coordinates and unique seat placement. Service validation additionally requires a complete grid matching the bus's full seat set. The full replacement uses one transaction under a bus row lock; a failed cell insertion restores the entire old map. Parallel replacements cannot combine partial grids. A different layout identity also invalidates an earlier selection after removal/recreation.

Any reservation on the bus, including a past reservation, blocks creating, changing or removing its map with 409 LAYOUT_HAS_BOOKINGS. An identical existing map remains allowed without rewriting cells. Configure physical geometry before accepting bookings. Capacity changes for a bus with an unreserved map return 409 BUS_HAS_LAYOUT; remove the map first, then resize under the existing trip restrictions, and configure the real arrangement again. Existing trips can still prevent capacity changes with BUS_HAS_TRIPS. Removing only the map never deletes seats or releases reservations. Bus deletion removes its map transactionally before deleting the bus; if trip/booking foreign keys block deletion, the map is restored too.

Read schemas/busLayoutSchema.ts for grid validation, controllers/busLayoutController.ts and routes/busLayoutRoutes.ts for the protected API, services/busLayoutService.ts for replacement/identity/locks, and utils/seatLayout.ts for the response shape. tripDetailsService.ts combines the map with occupancy; bookingService.ts rejects stale selections. These paths are under apps/api/src. Tests cover physical arrangements, authorization, complete-grid validation, seat preservation, raw database constraints, rollback, capacity/deletion guards, language-independent coordinates, historical reservation safeguards and concurrent layout edits/removal versus booking.

Layout verification: all twelve migrations applied to an empty temporary database; a second run applied zero. All fourteen PostgreSQL integration tests passed there. A compiled JavaScript HTTP smoke test exercised administrator map configuration, unchanged physical seat ids/numbers, rejection of an outdated layout selection, successful booking with the current map, per-trip occupancy, frozen reserved geometry and identical coordinates for Arabic/English requests. The temporary database and scoped fixtures were removed. All 131 default tests, type checks, lint, formatting and build pass. Existing development cities/trips remain unchanged with no test maps, cells, users or reservations left behind.
