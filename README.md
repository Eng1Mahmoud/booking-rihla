# Bus Booking Platform

A bus booking application for Egypt, built in focused feature batches with explanations.

## Current feature: Passenger trip search and demo seed

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

Catalog, Trip management, repeatable seed data, and passenger search are complete. Next add passenger trip details and departure seat availability, then continue accounts and reservations. Request IDs and structured logging remain deferred.

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

CORS is enforced by browsers and is not authentication, authorization, or CSRF protection. Cookie credentials are not enabled in this step; they will be configured with authentication. Tests verify response headers and preflight behavior using HTTP requests; they do not run a browser.

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

Example PowerShell request:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:4000/api/v1/cities -ContentType application/json -Body (@{ nameAr = 'القاهرة'; nameEn = 'Cairo' } | ConvertTo-Json)
```

POST accepts only nameAr/nameEn, trims whitespace, and requires 1-100 characters for each. The server generates the UUID; caller-supplied ids and unknown fields are rejected. City names are not unique yet. These are local development routes; administrator authorization will be added with authentication before public deployment.

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

A nonexistent city on create/move returns 404 CITY_NOT_FOUND. A missing station returns 404 STATION_NOT_FOUND. Deleting a city that still has stations returns 409 CITY_HAS_STATIONS; remove or move its stations first. The foreign key enforces these rules atomically, including callers that bypass HTTP validation. Other unexpected failures keep the generic 500 response. These management writes receive role protection during the planned authentication feature; the API remains a local development application.

The feature follows routes/stationRoutes.ts -> controllers/stationController.ts -> services/stationService.ts -> Prisma. schemas/stationSchema.ts validates Station requests, schemas/paginationSchema.ts shares pagination rules, and utils/databaseErrors.ts identifies PostgreSQL constraint codes without exposing raw error messages. No repository layer is added.

npm run test:db exercises both City and Station CRUD, moving/filtering stations, rejecting orphan writes, and blocking City deletion while stations exist. It creates uniquely scoped data and removes only its own rows. Both migrations and these tests also passed in a fresh temporary database; the existing local Cairo record was preserved. No demo station is added automatically.

## Bus and numbered-seat API

Apply npm run db:migrate before using this feature. Bus stores id (UUID), plateNumber (unique text), seatCount (integer 1-100), and isActive (boolean, default true). BusSeat stores its own UUID, busId, and number. Plate input is trimmed, internal whitespace collapsed, and letters uppercased before persistence. Names/types/amenities and visual seat layouts remain a later fleet extension.

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

Implementation follows routes/busRoutes.ts -> controllers/busController.ts -> services/busService.ts, with schemas/busSchema.ts for validation. No repository layer or extra runtime package is introduced. As with existing management routes, administrator authorization is added with the planned authentication feature before public deployment.

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

Deleting either station used by a route returns 409 STATION_HAS_ROUTES; delete its routes first. ON DELETE/UPDATE RESTRICT also protects writes that bypass HTTP. Route deletion maps dependent-record restrictions to 409 ROUTE_IN_USE when later modules add references. Management authorization follows the planned authentication feature before public deployment.

The implementation follows routes/routeRoutes.ts -> controllers/routeController.ts -> services/routeService.ts -> Prisma, with schemas/routeSchema.ts for validation. Single-row writes rely on database constraints atomically rather than a separate read-before-write check. No extra runtime dependencies or architectural layers are introduced.

npm test includes HTTP validation, responses, filters, partial updates and safe errors without requiring PostgreSQL. npm run test:db also verifies persistence, reverse directions, combined filtering/pagination, concurrent duplicate creation, failed-edit rollback, duration bounds, orphan rejection and station deletion restrictions in PostgreSQL. Tests remove only their own scoped rows.

Verification also applied all four migrations to a fresh temporary PostgreSQL database, reran them without changes, ran all four integration tests, exercised the compiled API route list, verified test cleanup, and removed that temporary database. Existing development data was preserved.

## Trip management API

Apply npm run db:migrate before using this feature. Trip joins an existing Route and Bus with departureAt, arrivalAt, pricePiastres, and status. Status is SCHEDULED by default or CANCELLED. The management list includes both statuses and past departures unless filtered. Passenger search is available below; departure seat availability is the next feature.

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

Create requires a future departure, including when creating a cancelled record. Editing an already departed trip returns 409 TRIP_DEPARTED. Partial time edits are validated against the stored opposite timestamp. PATCH status=CANCELLED cancels a future trip; PATCH status=SCHEDULED reinstates it only after all scheduling checks pass. Booking/refund/notification consequences will be added with those modules; there are no bookings or payments in this feature.

Trip writes run in a transaction. PATCH locks the trip before reading its current fields. Both create and update lock the route for sharing, then lock the target bus for update before checking overlap. A scheduled trip conflicts when another scheduled trip on the same bus departs before its arrival and arrives after its departure. Conflicts return 409 BUS_SCHEDULE_CONFLICT, including concurrent creates and edits. Cancelled trips do not occupy the bus. Back-to-back trips are allowed: no turnaround buffer or vehicle-location feasibility rule is assumed at this stage. Failed edits roll back without changing stored values. This overlap guarantee belongs to the service transaction; direct database writes must use the same scheduling protocol.

Database constraints separately enforce arrival after departure, nonnegative bounded prices, valid statuses and restrictive route/bus foreign keys. Deleting a referenced Bus or Route returns 409 BUS_IN_USE or ROUTE_IN_USE. A bus used by any trip, including a cancelled or past trip, cannot change seatCount (409 BUS_HAS_TRIPS). A route used by any trip cannot change endpoints (409 ROUTE_HAS_TRIPS). Create a different catalog record when needed; unchanged endpoint values, route duration, plates and active flags remain editable. Parent-row locks coordinate these checks with concurrent trip creation. Deleting all dependent trips releases these restrictions.

DELETE currently removes an unreferenced trip, including historical trips. The service maps dependent-record restrictions to 409 TRIP_IN_USE when bookings are introduced. Reservation-specific mutation rules will accompany bookings. These management endpoints remain local development APIs; administrator authorization follows the planned authentication feature before public deployment.

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

Results sort by departure instant then UUID. limit defaults to 20 (1-100), offset to 0 (0-100000). Pagination is applied in the database. Each result includes Trip fields with UTC ISO timestamps, bus id/seatCount (not its plate), and the route with origin/destination stations and their cities, including Arabic/English names. Relations are included in the database query rather than loaded in a per-trip loop. SeatCount is vehicle capacity; it is not a count of remaining available seats. Seat availability belongs to the next feature.

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
