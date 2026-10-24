# Bus Booking Platform

A bus booking application for Egypt, built in focused feature batches with explanations.

## API response contract — phase 1 (2026-10-20)

All JSON API replies use `{ success, code, message, data?, requestId? }`. `message` is one backend-owned, user-facing string selected by `Accept-Language` (`ar` or `en`, including regional language preferences; default `en`). Branch on `code`, never on translated message text. Validation failures use one general message. Responses vary by Accept-Language.

Success examples:

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "The request completed successfully.",
  "data": { "id": "..." }
}
```

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "The request completed successfully.",
  "data": { "items": [], "pagination": { "limit": 20, "offset": 0 } }
}
```

Failure example:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "راجع البيانات المدخلة وحاول مجددًا."
}
```

Only unexpected 5xx failures include `requestId` in the body; it matches X-Request-ID and can be shown as a support reference. The header remains on all API requests. Known PAYMENT_UNAVAILABLE and readiness failures have localized messages without a support id. Internal exception/parser details are never public messages.

Registration returns `data.verificationId`. Successful delete/logout operations return HTTP 200 with a success envelope instead of empty 204. Health returns `data.status: "ok"`; readiness returns `data.status: "ready"` on success or 503 SERVICE_UNAVAILABLE. The webhook still acknowledges receipt with HTTP 200, now with `data.received: true`.

Implementation: `apps/api/src/config/apiMessages.ts`, `utils/apiResponse.ts`, controller calls to sendSuccess and the central error handler. Existing feature components keep working through a temporary list adapter in the web API client. Browser requests pass their language through the gateway; the old frontend API-error translation table is removed. HTTP statuses, permissions, payment idempotency and uncertain-outcome handling are preserved.

This phase does not migrate sessions to server-only refresh, add Server Actions or remove the gateway. Those are subsequent phases. Where older examples below omit the envelope fields, use this contract; list records now live at data.items.

## Current backend status

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
{
  "success": true,
  "code": "SUCCESS",
  "message": "The request completed successfully.",
  "data": { "status": "ok" }
}
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

## Current validation policy

At the owner's request, automated test files and test scripts were removed on 2026-10-18. New features currently use TypeScript, ESLint, formatting and build checks without adding test code. Historical verification notes below describe checks completed before removal; they are not a runnable suite in this checkout. Tests can be restored from Git commit 0099df6. Keep createApp service overrides, provider/mail interfaces and separated services so automated tests can be added later.

## Verify and build

```sh
npm run format:check
npm run lint
npm run typecheck
npm run build
npm start
```

Stop the development server before `npm start`; both use the configured port. `npm start` runs the compiled JavaScript produced by `npm run build` and loads the same optional environment file.

Application code is TypeScript. The compiler checks API source and configuration; only application code goes into `apps/api/dist`. Build output is generated locally and excluded from Git.

## Understand the code

Read these files in order:

1. `package.json`: root commands delegate to the API workspace. A workspace lets us add passenger and admin apps later in the same repository.
2. `apps/api/package.json`: API commands and dependencies. Node runs TypeScript directly in development; TypeScript separately checks types and builds JavaScript.
3. `apps/api/src/config/env.ts`: defines the Zod rules. `parseEnv` validates environment strings, applies defaults, converts the port to a number, and returns typed settings. It does not read files or start the server.
4. `apps/api/src/server.ts`: passes `process.env` to `parseEnv`, creates the app with the validated CORS origins, then starts it on the validated port. Invalid configuration fails before listening.
5. `apps/api/src/app.ts`: exports createApp(corsOrigins), which creates Express, configures middleware, and defines HTTP responses. A GET request to `/api/v1/health` returns JSON with status 200. Unknown paths receive JSON with status 404.
6. `apps/api/tsconfig.json`: Node types and strict checking for source and Prisma configuration, automatically discovered by the editor. `tsconfig.build.json`: compiles only source files to `dist`.

Startup flow: optional environment file → process.env → parseEnv → app.listen.

Request flow: browser → server listening on the configured port → Express route → JSON response.

References: [Express setup](https://expressjs.com/en/starter/installing/), [Node's TypeScript support](https://nodejs.org/api/typescript.html), [Node environment-file loading](https://nodejs.org/api/cli.html#--env-file-if-existsfile), and [Zod schemas](https://zod.dev/api).

## Next feature

The backend implementation is ready for local frontend integration. Begin the passenger website, followed by the administration dashboard. Paymob checkout/refunds remain disabled pending the account-specific TEST setup and verification listed in the backend handoff below. GitHub Actions billing troubleshooting and automated test code are deferred at the owner's request. Production operations require separate approval.

## Git workflow

Group related implementation, validation, migrations, and usage notes into one feature commit. Finish the feature, verify it, explain the result, commit, and push under the owner's standing instruction before starting the next. Finish the backend before the passenger website, then build the dashboard. Never commit `.env`, dependencies, or build output. The safe `.env.example` is committed so other developers know which settings exist. Git author identity is configured locally for this repository.

The owner has authorized pushing each completed feature after its checks. Production publication and real-money operations require separate explicit approval.

## Linting

Run npm run lint from the repository root. ESLint checks API source and Prisma configuration using recommended JavaScript and TypeScript rules. Intentionally unused function parameters may start with an underscore. The command reports problems without changing files, and fails on any errors or warnings. Generated output, dependencies, and coverage are excluded. The tool configuration is eslint.config.mjs; application code remains TypeScript.

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
| DELETE | /api/v1/cities/:id               | Delete a city and return 200 with a success envelope |

Example PowerShell request after signing in as ADMIN or SUPER_ADMIN (set $accessToken from data.accessToken in the login response):

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:4000/api/v1/cities -Headers @{ Authorization = "Bearer $accessToken" } -ContentType application/json -Body (@{ nameAr = 'القاهرة'; nameEn = 'Cairo' } | ConvertTo-Json)
```

POST accepts only nameAr/nameEn, trims whitespace, and requires 1-100 characters for each. The server generates the UUID; caller-supplied ids and unknown fields are rejected. City names are not unique yet. Writes require an authenticated ADMIN or SUPER_ADMIN; city lookups remain public. See the authorization matrix below.

List responses contain data and pagination (limit and offset). Limits range from 1 to 100, offsets from 0 to 100000. Invalid inputs return 400, non-JSON create requests return 415, and unexpected database failures return the existing generic 500 response without private details.

City follows a simple layered structure: routes/cityRoutes.ts maps endpoints, controllers/cityController.ts validates HTTP inputs and sends responses, services/cityService.ts returns plain data using Prisma, and schemas/citySchema.ts defines validation. There is no separate repository layer. createApp accepts optional cities/stations/buses/routes/trips service overrides for isolated HTTP tests. Express 5 forwards rejected route promises to the centralized error handler.

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
| DELETE | /api/v1/stations/:id                                | Delete a station and return 200 with a success envelope          |

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

## Bus and numbered-seat API

Apply npm run db:migrate before using this feature. Bus stores id (UUID), plateNumber (unique text), seatCount (integer 1-100), and isActive (boolean, default true). BusSeat stores its own UUID, busId, and number. Plate input is trimmed, internal whitespace collapsed, and letters uppercased before persistence. Optional busTypeId and many-to-many amenities are implemented below; optional seatLayout selects a fixed template, as described below.

| Method | Path                                          | Behavior                                                               |
| ------ | --------------------------------------------- | ---------------------------------------------------------------------- |
| GET    | /api/v1/buses?isActive=true&limit=20&offset=0 | List buses with optional active/inactive filtering                     |
| GET    | /api/v1/buses/:id                             | Read one bus or return BUS_NOT_FOUND                                   |
| GET    | /api/v1/buses/:id/seats                       | Read its numbered seats in ascending order                             |
| POST   | /api/v1/buses                                 | Create the bus and seats 1 through seatCount atomically                |
| PATCH  | /api/v1/buses/:id                             | Edit the plate, capacity, or active status                             |
| DELETE | /api/v1/buses/:id                             | Delete the bus and its owned seats; return 200 with a success envelope |

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
| DELETE | /api/v1/routes/:id | Delete the route; return 200 with a success envelope                                 |

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

Verification also applied all four migrations to a fresh temporary PostgreSQL database, reran them without changes, ran all four integration tests, exercised the compiled API route list, verified test cleanup, and removed that temporary database. Existing development data was preserved.

## Trip management API

Apply npm run db:migrate before using this feature. Trip joins an existing Route and Bus with departureAt, arrivalAt, pricePiastres, and status. Status is SCHEDULED by default or CANCELLED. The management list includes both statuses and past departures unless filtered. Passenger search is available below; passenger detail and seat endpoints are available below.

| Method | Path              | Behavior                                                        |
| ------ | ----------------- | --------------------------------------------------------------- |
| GET    | /api/v1/trips     | List trips, optionally filtered by routeId, busId and status    |
| GET    | /api/v1/trips/:id | Read one trip or return TRIP_NOT_FOUND                          |
| POST   | /api/v1/trips     | Create a future trip; return 201 and Location                   |
| PATCH  | /api/v1/trips/:id | Edit references, times, price or status before departure        |
| DELETE | /api/v1/trips/:id | Delete an unreferenced trip; return 200 with a success envelope |

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

## Egyptian development catalog

With PostgreSQL running and apps/api/.env configured:

```sh
npm run db:migrate
npm run db:seed
```

The catalog contains 7 cities, 17 stations, 18 directed routes and 36 buses with 44 seats in the STANDARD_2_2 layout. It schedules morning/evening departures for 14 Cairo calendar days (504 trips). Past departures on the first day are excluded by the passenger API. Prices, fleet, times and amenities are development examples, not BlueBus's commercial inventory. City and station names were checked against the public [BlueBus station directory](https://bluebus.com.eg/stations) on 2026-10-19.

Stable ids make ordinary seed runs insert missing rows without duplicating or overwriting existing catalog rows. All writes run in one transaction and seed commands share an advisory lock. Production seeding is disabled.

Explicitly clear **all application data**, including accounts, bookings, payments and catalog rows, then create the Egyptian catalog:

```sh
npm run db:seed -- --reset-local-data
```

This destructive command is restricted to a non-production database named bus_platform on a loopback address. It preserves the Prisma contract/migration schema. It creates no backup. Run it only when deliberately replacing local data. Implementation: scripts/egyptCatalog.ts, scripts/seedEgyptCatalog.ts and scripts/seed.ts.

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
  "success": true,
  "code": "SUCCESS",
  "message": "The request completed successfully.",
  "data": {
    "items": [],
    "pagination": { "limit": 20, "offset": 0 },
    "search": { "travelDate": "2099-01-01", "timeZone": "Africa/Cairo" }
  }
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

Names are trimmed and contain 1-100 characters. Emails are trimmed/lowercased and limited to 254 characters. Phone numbers use international +country-code format with 8-15 digits, without spaces; phone uniqueness is not assumed. Passwords contain 12-128 characters, at most 512 UTF-8 bytes, and are not trimmed. language is ar (default) or en. Unknown fields, including caller ids/roles, are rejected. JSON is required and query parameters are unsupported. Register returns a generic message plus a random data.verificationId receipt, without user ids, password hashes or codes. A new registration receives its real verification id; duplicate emails receive an indistinguishable decoy id, preserve existing credentials and do not queue email. Keep the original receipt for verification/resend; a duplicate registration must not activate an account created by another client.

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

| Method | Path                    | Behavior                                                                                 |
| ------ | ----------------------- | ---------------------------------------------------------------------------------------- |
| POST   | /api/v1/auth/login      | Verified, active account signs in; sets refresh cookie and returns access token/user     |
| POST   | /api/v1/auth/refresh    | Consumes refresh cookie and sets its replacement                                         |
| GET    | /api/v1/auth/me         | Returns the current user using Bearer access authentication                              |
| POST   | /api/v1/auth/logout     | Revokes the refresh cookie's session, clears cookie, returns 200 with a success envelope |
| POST   | /api/v1/auth/logout-all | Revokes every session for the authenticated user and returns 200 with a success envelope |

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

Local HTTP cookies are named bus_refresh; production uses __Secure-bus_refresh and Secure. Both are HttpOnly, SameSite=Strict, host-only (no Domain), expire at session expiry, and use Path=/api/v1/auth. Logout clears matching attributes. Unknown/missing refresh cookies yield 401 on refresh and idempotent 200 success on logout. Refresh auth failures clear the cookie. Logout-all requires a valid Bearer token and revokes all currently existing sessions; a later fresh sign-in can create another session. Expired/revoked session/token records remain for replay detection until later maintenance cleanup.

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

The reusable middlewares/requireRole.ts accepts explicit allowed roles: management currently permits ADMIN and SUPER_ADMIN. Administrator management now permits only SUPER_ADMIN through the separate /api/v1/admin/admins routes. Refund issuance permits only SUPER_ADMIN. Reservation endpoints now enforce passenger ownership separately, including for administrator accounts.

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

Examples: GET /api/v1/admin/bookings?reference=BUS-0123456789ABCDEF or GET /api/v1/admin/bookings?email=customer%40example.com&travelDate=2026-11-01&limit=20&offset=0. Replace these placeholders with real booking/customer data. Reference/email searches are exact, not partial or wildcard searches. URL-encode query values. Repeated, malformed, unknown and nested query fields return 400 VALIDATION_ERROR. Valid filters that match no reservations return data.items: [] with normal pagination, not 404. travelDate uses the Cairo day's inclusive start and exclusive end, including daylight-saving changes; it is not the booking creation date or the UTC departure date.

List replies contain data: { items: [...], pagination: { limit, offset } }. Results sort by createdAt descending, then id descending for deterministic ties. Each summary contains the existing reservation reference/status/contact phone, seat count, integer-piastre price snapshot/total, currency EGP, paymentRequired: false, createdAt and trip/route/station/city information. It adds customer: { id, name, email, phone } and trip.status. Customer phone is the account phone; contactPhone is the separate phone supplied with that booking. Passenger names and seat allocation arrays are omitted from list queries and responses.

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

List responses are { success, code, message, data: { items: [...], pagination: { limit, offset } } }; empty matches return 200 with an empty data.items array. Order is createdAt descending then id descending for deterministic ties. Detail returns { data: account }. The selected fields are id, name, email, phone, role USER, language, isActive, emailVerifiedAt (nullable ISO string) and createdAt (ISO string). Password hashes, activation/reset codes, sessions, refresh tokens and login-failure/lockout fields are not loaded for the public account projection. Detail/status routes reject all query parameters; unsupported, repeated, nested or malformed filters/ids return 400 VALIDATION_ERROR.

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

The staff list accepts optional exact email (trimmed/lowercased), role ADMIN/SUPER_ADMIN, isActive true/false, limit 1-100 (default 20), and offset 0-100000 (default 0). Filters combine with AND. It returns { success, code, message, data: { items: [...], pagination: { limit, offset } } } sorted by createdAt descending then id descending. Empty matches return 200 and an empty array. Read/status queries exclude USER accounts; a missing or passenger detail/status target returns 404 ADMINISTRATOR_NOT_FOUND. Staff responses share the selected safe account fields used by passenger management: id, name, email, phone, role, language, isActive, emailVerifiedAt and createdAt. No password, reset/activation code, lockout field or session/token data is exposed.

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

## Paymob TEST direct card payments

Auth/Capture was removed at the owner's request. This integration uses direct TEST card payments in EGP. There are no create-authorization, capture or void operations or PAYMOB_AUTH_CAPTURE_ENABLED setting. Paymob's is_auth/is_capture response fields remain necessary to verify HMAC and reject transactions of the wrong kind; historical migrations are retained.

Flow: ten-minute hold -> server-priced PaymentAttempt -> durable PaymentSession -> Intention / Unified Checkout -> signed receipt -> authenticated inquiry -> SALE/SUCCEEDED, CONFIRMED booking and one Ticket atomically. One attempt/session per booking and a committed claim before I/O prevent duplicate Intention requests. A timeout remains UNKNOWN and is investigated by reference inquiry, never blind creation retry. Checkout links are encrypted at rest and exposed only to the current authenticated owner after rechecking hold, seats, account/session and trip/catalog eligibility.

```http
POST /api/v1/bookings/:id/payment-attempt
Authorization: Bearer <access-token>
Idempotency-Key: <uuid>

GET /api/v1/bookings/:id/payment-attempt
POST /api/v1/bookings/:id/checkout
GET /api/v1/bookings/:id/payment
GET /api/v1/bookings/:id/ticket
```

Preparation accepts no client amount. Intention uses the [official API](https://developers.paymob.com/paymob-docs/intention-apis/create-intention) with EGP, one TEST card Integration ID, items, billing data, unique server special_reference, notification/return URLs and expiration limited to the remaining hold seconds. No is_auth field is sent. The response must match TEST mode, integration, reference, currency and amount. Creation requires at least 60 seconds of remaining hold time (Paymob's validated minimum); a new checkout returns PAYMENT_WINDOW_TOO_SHORT during the final minute. Existing valid links remain retrievable until the hold deadline. Creation/link exposure never extend a hold.

### Notification, inquiry and hold expiry

POST /api/v1/payments/paymob/webhook?hmac=<signature> validates the documented SHA-512 HMAC in constant time and scopes integration/currency/owner. It atomically deduplicates the signed event without saving raw card/customer data, signatures or secrets. Receipt alone does not confirm a booking. GET /api/v1/payments/paymob/return is a neutral, no-store Arabic page which ignores all browser query values. It is usable before the passenger website exists.

```sh
npm run payment:worker
npm run payment:reconcile
npm run refund:worker
npm run booking:worker
npm run email:worker
```

Authenticated inquiry matches transaction/order/reference, owner, integration, TEST mode, EGP and the exact server price. Signed events supply candidates; latest reference inquiry also runs so an old declined callback cannot hide a newer successful payment whose callback was lost. Pending, declined, LIVE, authorization-only, child and mismatched payments never confirm. Provider requests run outside database locks. Trip locking serializes confirmation with expiration, reallocation and cancellation; only a valid unexpired booking retaining all its seats receives a ticket.

Direct charging cannot guarantee zero refunds: a payment started before checkout expiry can finish after a local seat hold expires. A verified successful charge for an unavailable/expired booking atomically creates a full PENDING refund, expires that booking and never takes a reallocated seat or issues a ticket. This exceptional unfulfillable payment is distinct from passenger cancellation, which remains prohibited. Only a super admin may send the refund. Late payment refunds use the same exact original standalone transaction as operator-cancellation refunds, with authenticated full-refund evidence, durable send-once claims and notices.

Declines and abandoned checkouts do not retain seats after the hold deadline. An unsuccessful inquiry does not prove another attempt cannot finish; unresolved sessions keep polling and appear in ops:status after 15 minutes. No missing response is invented as failure or success. Active/unresolved checkout holds block operator cancellation; expired holds do not. Later successful charges on cancelled trips use the full-refund path.

### Local settings and remaining real-provider verification

```sh
npm run payment:setup
npm run payment:check
```

These inspect local configuration and never create payments. The adapter accepts TEST keys only. Required PAYMOB_ fields: SECRET_KEY, PUBLIC_KEY, API_KEY, HMAC_SECRET, INTEGRATION_ID, OWNER_ID, NOTIFICATION_URL and RETURN_URL. PAYMENT_CHECKOUT_SECRET is an independent random 32-byte hexadecimal key. Keep keys and local .env files out of Git.

OWNER_ID is the account user id from the authenticated API-key response profile.user.id, and must match owner in transaction inquiry; profile.id is a different merchant/profile identifier. API-key authentication succeeded and the owner setting was filled from that authenticated response. A real TEST card payment and full refund have also been verified as described below.

```dotenv
PAYMOB_NOTIFICATION_URL=https://your-public-api/api/v1/payments/paymob/webhook
PAYMOB_RETURN_URL=https://your-public-api/api/v1/payments/paymob/return
```

A reachable HTTPS development tunnel or deployed API is required: Paymob cannot call localhost. Neither a purchased domain nor a frontend is required for sandbox verification. Do not use placeholder URLs in a real payment. Configure TRUST_PROXY_HOPS for the actual reverse-proxy chain.

During setup keep flags false. A controlled TEST checkout requires PAYMOB_ENABLED, PAYMOB_WEBHOOK_ENABLED, PAYMOB_RECONCILIATION_ENABLED, PAYMOB_REFUNDS_ENABLED and PAYMOB_CHECKOUT_ENABLED all true, matching owner scope, complete settings and running workers. Flags enable a local code path; they do not certify account permissions. The refund worker reconciles already-claimed refunds; a super admin still issues PENDING refunds.

Before declaring payment integration verified, exercise actual hosted TEST checkout success/decline/3-D Secure, actual HMAC notification delivery, authenticated inquiry and one ticket, duplicate notification/restart recovery, expiry and late-payment reallocation, operator cancellation and one full refund with authenticated amount evidence and notice. Use Paymob's official TEST cards only. Local fake-provider checks do not satisfy this remote checklist. Auth/Capture activation is not a prerequisite.

### Status and operator reads

Owner status returns bookingId, bookingStatus, paymentStatus, refundStatus, amountPiastres, currency, expiresAt and serverTime. Payment statuses: NOT_STARTED, PREPARED, INITIALIZING, AWAITING_PAYMENT, UNKNOWN, PROCESSING, PAID, REFUND_REQUIRED, REFUNDED, FAILED, EXPIRED, REVIEW. READY means checkout exists, not paid. A closed EXPIRED session may belong to a PAID booking. REFUND_REQUIRED means verified money could not fulfill a booking; PENDING refund is a debt, not a returned amount. REFUNDED requires exact full authenticated evidence.

Protected GET /api/v1/admin/payments and /:id are paginated/no-store and share the passenger status serializer. Filters: bookingId, tripId, userId, reference, email, orderId, intentionId, transactionId, sessionStatus, settlementStatus, settlementKind=SALE and Cairo createdDate. The response uses paymentSession instead of authorization. Reads project only safe provider references, states, amounts and minimal customer identity; they never decrypt links, query Paymob or change money/state.

## Confirmed-booking tickets and email

A successful, independently verified full payment now commits Booking.CONFIRMED, SALE/SUCCEEDED, completed authorization and one Ticket **in the same database transaction**. The bookingId unique constraint and existing trip/settlement locks prevent duplicate ticket issuance during concurrent or repeated reconciliation. No email is sent inside the payment transaction. Pending, unknown, voided or review payments do not issue tickets. This adds one table/index/constraints; it does not change old financial rows or fabricate tickets for old/manual confirmed fixtures.

Authenticated passengers read their own ticket with:

```http
GET /api/v1/bookings/<booking-uuid>/ticket
Authorization: Bearer <access-token>
```

The API returns data with ticket id, bookingId, booking reference, issuedAt, EGP totalPiastres, passenger names/seat numbers, bilingual origin/destination city/station labels, UTC departure/arrival and qr.payload/qr.imageDataUrl (PNG). The frontend can display the PNG data URL directly. Times in the email use Africa/Cairo. There is one ticket for the entire booking, including all its passengers. No PDF is generated in this feature.

Reads require current authenticated ownership, including when the caller has an administrator role. Missing/other-owner/unissued/unsafe tickets return the same 404 TICKET_NOT_FOUND. Only CONFIRMED bookings with matching successful direct-payment evidence, complete seat allocations and a scheduled trip are returned. Historical journeys can still be read; expired hold timestamps do not invalidate a confirmed booking. Query parameters and ticket creation/update/delete routes are unavailable. Responses use Cache-Control: no-store; reads are bounded to 60 requests per minute/IP after authentication. Reading a ticket does not query Paymob, send mail or alter the booking.

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

Each batch selects at most 20 due records through booking/trip relations and the reminder index. It locks and re-reads each Ticket before sending, rechecks the clock after taking the lock, and validates current confirmed/full-payment payment evidence, active seat allocations, scheduled trip, and an active verified recipient. Cancelled/departed trips, unconfirmed/unresolved/review payments, invalid allocations and suspended/unverified accounts are discarded without SMTP. A trip moved outside the window would wait for its new window. These checks reuse ticket validation but do not generate another QR PNG for the reminder.

The message uses the recipient's current Arabic/English preference and email and includes booking reference, stations, departure time and passenger seat numbers in plain text. It does not attach another QR or claim another payment. A separate stable Message-ID, departure-reminder-<ticket-id>, distinguishes it from the original ticket. Confirmation-mail fields, ticket id, booking status, payment state and seat ownership remain unchanged when reminders succeed or fail. A failed original ticket email does not automatically block an otherwise eligible reminder.

Concurrent/restarted workers skip committed reminderSentAt/discardedAt records. SMTP failures back off from 30 seconds and stop after five attempts; each retry rechecks eligibility and cannot send after departure. The same at-least-once SMTP limit applies as for ticket email: a crash after SMTP acceptance but before the database success commit can duplicate the message. Stable Message-ID is not a guarantee of recipient-side deduplication. There is no public resend action or additional reminder history table.

Tests cover the exact 24-hour and departure boundaries, offset changes, late confirmations, catch-up, multiple real PostgreSQL workers, restart-safe state, failure backoff/exhaustion, unsafe payments/seats/accounts, and unchanged ticket/payment state. Delivery tests inject a sender; they do not send external mail or perform a real Paymob transaction. Payment gates remain unchanged.

## Authentication data cleanup

Apply npm run db:migrate before running the new cleanup worker. This migration makes EmailVerification.codeHash nullable and adds expiry indexes for verification/reset hashes, account email and sessions. It does not remove any existing data during migration, change booking/payment state or alter session lifetimes. No dependency or environment variable is added.

```powershell
# Process one bounded batch and exit:
npm run auth:cleanup
# Process immediately, then repeat hourly while the process runs:
npm run auth:cleanup:worker
```

The cleanup worker is separate from SMTP delivery. It uses the existing DATABASE_URL, closes its database connection on shutdown, and interrupts its hourly wait on SIGINT/SIGTERM. A one-shot failure exits nonzero with a safe message; successful output contains aggregate counts only. No desktop automation, scheduled task or public deletion endpoint is created. The process must be kept running by the application host for periodic cleanup; a large backlog can be drained with repeated one-shot runs.

Each run selects up to 100 candidates **per category**, ordered by expiry/id. The internal service accepts a validated limit of 1..1000 for tests/maintenance, not from a public request. The run captures a single server-time cutoff. Expiry at the cutoff is considered expired; deletion starts at the inclusive boundary of 24 elapsed hours after expiry.

| Data                   | Cleanup behavior                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| EmailVerification      | Clear expired codeHash to null; retain the row/id, attempts, resendAfter, windowStartedAt and sendCount                         |
| PasswordReset          | Clear an expired codeHash; retain the row and consumption/throttle metadata                                                     |
| EmailOutbox            | Clear expired encryptedCode; remove the account-mail row only when expiresAt is at least 24 hours old                           |
| Session / RefreshToken | Remove the Session only when expiresAt is at least 24 hours old; its refresh-token family is deleted by the existing FK cascade |

An expired code cannot authenticate even if cleanup is stopped: request-time validation remains authoritative. Clearing its hash removes an unneeded secret. Verification rows are retained because resend requires the original verificationId; deleting the row would strand an unverified account. Reset rows retain hourly send limits as well. Both are bounded to one row per user, and successful verification/recovery keeps its existing behavior. The verification API and mail worker explicitly reject a null hash, and resend can renew the same id after the cooldown/send window permits it.

Refresh-token rotation leaves used token hashes as replay evidence. Cleanup therefore does **not** delete used tokens based on usedAt, nor individual tokens based only on their own expiry. All tokens of an unexpired or grace-period Session remain, including revoked sessions until their original expiry plus the grace period. Access/refresh authentication still rejects expired/revoked sessions immediately; retention does not extend validity. The final Session deletion is serialized with refresh using the same Session row lock.

Code cleanup takes the same email advisory lock as verification, resend and password recovery, then rechecks expiry/hash before clearing. A concurrently renewed code remains valid. Account-mail cleanup takes only its outbox row lock, matching SMTP processing, and rechecks expiry before update/delete. It never takes the account lock after an outbox lock. Concurrent cleanup runs can select the same candidates safely: only the actual successful change is counted and later runs make progress. Partial progress survives a later error and can be rerun.

Cleanup does not delete users, reservations, seat allocations, payment records/events, tickets, ticket/reminder delivery metadata or audit history. It does not send messages or contact Paymob. Integration tests use isolated PostgreSQL and cover cleared-code resend/recovery, intact send limits, fresh-code/mail preservation, exact retention boundaries, cascade deletion, valid JWT sessions and replay-triggered family revocation after cleanup, bounded batches, concurrent cleanup and renewal. The destructive cleanup command is tested against an isolated test database; migration verification on the development database compares all existing rows without running deletion there.

## Administrator operational statistics

`GET /api/v1/admin/statistics?travelDate=2026-10-17` requires a current verified, active ADMIN or SUPER_ADMIN session. The only query field is an optional valid travelDate (YYYY-MM-DD, years 2000..9998); omitted means today in Africa/Cairo. Responses are no-store and limited to 60 requests per minute per IP after authentication. No additional dependency, schema migration or worker is needed.

All metrics are scoped to trips **departing on the selected Cairo day**, using the inclusive day start and exclusive next-day start. This is a travel-day report, not a booking creation-day report. Bounds respect daylight-saving changes (including 23/25-hour days). The response returns travelDate, timeZone, UTC start/end and serverTime alongside these aggregates:

| Group                  | Meaning                                                                                                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| trips                  | total, scheduled, cancelled; scheduled is split into upcoming (departure after serverTime) and departed (at or before serverTime). These describe scheduled times, not tracked physical departure or completion.                                             |
| bookings               | Total bookings for all trips in the day, including cancelled trips, split into reserved, pendingPayment, paymentProcessing, confirmed and expired. Counts are bookings, not passengers.                                                                      |
| seats                  | Actual BusSeat capacity summed **per scheduled trip**, excluding cancelled trips. Only unreleased allocations belonging to non-expired bookings count as occupied, split into reserved, held, paymentProcessing and confirmed. available = total - occupied. |
| seats.occupancyPercent | occupied / total * 100, rounded to two decimals; zero when there is no capacity. Includes valid temporary holds, so this is allocation occupancy, not paid occupancy.                                                                                        |

A pending hold with expiresAt at/before serverTime is logically EXPIRED even if the expiry worker has not changed its stored status or released its seat rows. PAYMENT_PROCESSING and CONFIRMED remain allocated after their original hold deadline; RESERVED legacy bookings have no hold deadline. Released seats and expired bookings contribute no occupancy. Historical scheduled trips remain in the denominator; inactive bus/route catalog flags do not rewrite operational history. Available here means unallocated capacity, not necessarily bookable seats: a trip may have departed or have inactive catalog parents.

One parameterized PostgreSQL statement aggregates the entire response from one database snapshot; it returns only counts, without loading customer identities, credentials, provider data or entire booking lists into the API. This is read-only: it performs no expiry cleanup, payment inquiry, email or money operation. A confirmed booking count is a booking-state metric; it is not independently verified revenue. Financial revenue/refund reporting remains separate.

## Administrator payment statistics

GET /api/v1/admin/payments/statistics accepts an optional Cairo date. dateBasis is SETTLEMENT_LAST_UPDATED_AT, the application's recorded outcome time. One parameterized SQL query returns total, paid, refundRequired, requested, unknown and requiresReview settlement counts. paid.amountPiastres and paid.amountEGP are exact string gross sums of matching confirmed SALE outcomes; unfulfillable paid bookings are counted separately. Refunds have a separate report. These totals do not claim net revenue, fees, bank payout time or the provider transaction timestamp.

## GitHub Actions: Backend CI

The workflow in [.github/workflows/ci.yml](.github/workflows/ci.yml) runs on pushes, pull requests and manual dispatch from the repository's Actions tab. Its `API quality` job uses Ubuntu 24.04 and Node.js 24.18.0, then runs these root commands in order:

1. `npm ci`: install the exact dependency tree from the committed package-lock.json.
2. `npm run format:check`: report formatting differences without changing files.
3. `npm run lint`: check source and Prisma configuration with ESLint.
4. `npm run typecheck`: check TypeScript without emitting JavaScript.
5. `npm run build`: compile the API into the runner's temporary apps/api/dist.

A failed step fails the job; subsequent steps are skipped. Each job has a 15-minute limit. A new run cancels an older in-progress run on the same workflow/ref. npm's download cache is keyed by package-lock.json; node_modules and dist are not uploaded as project artifacts. Checkout/setup-node are pinned to verified release commits with readable version comments. When updating an action, update its hash and comment together after verifying the official release.

No repository secrets, local .env files, database service, mail service or Paymob configuration are required. The job does not start the API/workers, apply migrations, seed data, run automated tests or deploy anything. Existing generated Prisma contract files are committed, so type checking/build do not need database generation. Future tests can be added as an explicit step when the owner resumes testing.

Open [GitHub Actions](https://github.com/Eng1Mahmoud/bus-booking-platform/actions) and select **Backend CI** to inspect each step. The workflow reports success/failure; requiring it before merging would need a separate branch-protection/ruleset setting, which is not changed here.

Official references: [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [setup-node](https://github.com/actions/setup-node), [checkout](https://github.com/actions/checkout).

## Request identifiers

Every API request receives a server-generated UUID in the X-Request-ID response header, including errors and CORS preflight responses. Browser clients on allowed origins can read this header. Middleware stores the identifier in response.locals.requestId for future logging. Caller-supplied identifiers are not trusted. This identifier is for troubleshooting, not authentication. No request bodies, tokens or personal data are logged by this feature.

## Backend handoff — 2026-10-18

The local API base is http://127.0.0.1:4000/api/v1. Run npm ci, start PostgreSQL/Mailpit with docker compose up -d --wait, apply npm run db:migrate, and seed with npm run db:seed. On a fresh checkout only, copy the root and API .env.example files to their respective .env files and set local secrets; never overwrite an existing .env. The API DATABASE_URL must match the root PostgreSQL settings. Start npm run dev. Use the same hostname consistently for browser/API local development because localhost and 127.0.0.1 differ for cookies and CORS.

Start npm run email:worker in another terminal for account codes, tickets, departure reminders and operator/refund notifications. npm run booking:worker releases expired holds. npm run auth:cleanup:worker performs bounded account/session cleanup. npm run payment:worker and npm run refund:worker are opt-in TEST provider inquiry workers; they require the corresponding verified local configuration. Workers are separate processes, not automatically started by the API. Redis/BullMQ is not required for the existing PostgreSQL-backed outboxes.

### Browser integration contract

- Public reads: GET /cities, GET /stations, GET /trips/search, GET /trips/:id/details and GET /trips/:id/seats. Search accepts travelDate plus one originCityId/originStationId and one destinationCityId/destinationStationId, with limit/offset pagination. Travel dates use Africa/Cairo; API timestamps are ISO instants with a timezone.
- Accounts: POST /auth/register, /auth/verify-email, /auth/resend-verification, /auth/login, /auth/refresh, /auth/logout, /auth/logout-all, /auth/forgot-password and /auth/reset-password; GET /auth/me. Keep data.verificationId from registration for verification/resend. Passwords are 12-128 characters, phones use international format, and language is ar/en.
- Website browser requests use the same-origin /api/backend gateway, JSON and X-CSRF-Protection: 1. Access and refresh tokens remain in website HttpOnly cookies. Next.js attaches the Bearer token for Express; browser JavaScript receives no tokens. Production website cookies require HTTPS. This phase retains the existing refresh coordination until the server-session migration.
- Booking: POST /bookings with tripId, contactPhone and passengers [{seatId, name}]. Prices and totals come from the server. GET /bookings and GET /bookings/:id only expose the current owner's records. There is no passenger cancellation route. A pending payment hold lasts at most ten minutes and ends no later than departure.
- Payment: POST/GET /bookings/:id/payment-attempt, POST /bookings/:id/checkout and GET /bookings/:id/payment. Payment preparation uses an Idempotency-Key UUID. Use expiresAt and serverTime for the countdown, refresh availability after a conflict, and treat PAYMENT_PROCESSING/UNKNOWN as unresolved. Browser redirects are not payment confirmation. A disabled provider returns 503 PAYMENT_UNAVAILABLE; the website must display this state rather than claim payment succeeded.
- Tickets: GET /bookings/:id/ticket only returns a currently valid, paid and confirmed ticket. A cancelled trip invalidates its ticket. QR contents are opaque identifiers, not boarding authorization.
- Operator APIs: existing city/station, fleet, amenities, routes and trip management; /trips/batch/preview and /trips/batch; protected /admin/bookings, /admin/payments, /admin/users, /admin/statistics and /admin/payments/statistics. Super-admin administrator and audit APIs retain their existing restrictions.
- Replies use {success, code, message, data?, requestId?}. The backend localizes message via Accept-Language; lists use data.items and data.pagination. Only unexpected server-error bodies include requestId for support. Handle 401 (session), 403 (role), 409 (state/seat conflict), 429 (rate limit) and 503 (unavailable service).
- Money uses integer piastres, currency EGP. Refund/report amounts are exact decimal strings of piastres to avoid aggregate rounding; convert for display only. Booking states can now expose CANCELLED; payment state can expose REFUNDED. Cancellation is derived from trip state while original confirmed payment history remains persisted.

### Operator cancellation and full refunds

The approved policy is no passenger cancellation, full refund if the company cancels a trip, and Super Admin issuance of refunds. This initial implementation also restricts trip cancellation to Super Admin. Endpoints are:

| Method | Path relative to /api/v1     | Behavior                                                               |
| ------ | ---------------------------- | ---------------------------------------------------------------------- |
| POST   | /admin/trips/:id/cancel      | JSON {reason}, 5-500 characters; cancel a future trip atomically       |
| GET    | /admin/refunds               | Paginated safe refund records                                          |
| GET    | /admin/refunds/statistics    | Lifetime verified-refund counts and exact gross refunded sum           |
| GET    | /admin/refunds/:id           | Safe refund state/details                                              |
| POST   | /admin/refunds/:id/issue     | Claim and send one full TEST refund; returns 202, not proof of success |
| POST   | /admin/refunds/:id/reconcile | Read authenticated provider evidence; never send another refund        |

Cancellation serializes on the Trip row, preserves history, releases seat allocations, expires unpaid holds and creates exactly one PENDING refund for each verified paid booking. It creates durable Arabic/English notices. Repeating cancellation does not create duplicate refunds/notices. Operator-cancelled trips cannot be reactivated, edited or deleted. In-flight/unknown payment authorizations and review cases block cancellation with PAYMENTS_UNRESOLVED; reconcile those before retrying. After departure this endpoint rejects cancellation. This conservative restriction avoids cancelling while a payment may still be completing; it is not a live automated mass-refund system.

Refund transitions are PENDING -> REQUESTED -> UNKNOWN/SUCCEEDED/REVIEW. PENDING means money is owed, not returned. The service revalidates the current super-admin account/session, verifies TEST/EGP/merchant/order/amount and original direct-payment transaction identity, commits a unique send claim, then contacts Paymob. Repeated requests, worker restarts and timeouts never resend a claimed refund. Inquiries may be repeated. A full matching refunded amount is required for SUCCEEDED; partial/inconsistent evidence goes to REVIEW. A crash between claim and provider send can leave UNKNOWN indefinitely; manual provider investigation is required, never a blind automatic refund retry. The current API deliberately has no endpoint to mark a refund successful without provider evidence or clear a REVIEW claim for resending.

GET booking details exposes the owner's refund id/status/amount; operator payment reads show REFUNDED after confirmed full refund. Original confirmed booking/payment records remain available for financial history. Refund totals use the current verified state over all time, not a bank ledger or a provider settlement date. Fees and payouts are unknown/null; no net-revenue or bank-payout claim is made without those external records.

The email worker delivers TRIP_CANCELLED and REFUND_SUCCEEDED independently, with up to five attempts and exponential backoff. A verified owner receives financial notices even if their app account is suspended. SMTP is at least once after a crash. A cancellation notice says a refund is due; only the separate verified-success notice says money was refunded. Failed delivery never reverses cancellation or financial state.

Set PAYMOB_REFUNDS_ENABLED=true only after verifying account-specific TEST refund support. This does not enable checkout or LIVE payments. Refund transport follows the [official Paymob advanced payment actions](https://github.com/PaymobAccept/Paymob-AI-Integration-Skill/blob/main/skills/paymob-integration/references/advanced-features.md). A TEST standalone card payment and full refund were verified with this merchant account; LIVE payments are not supported by this adapter.

### Operational checks and remaining external setup

GET /health checks the HTTP process; GET /ready probes PostgreSQL and returns a success envelope with data.status ready, or a 503 SERVICE_UNAVAILABLE failure envelope, with no connection details. The readiness probe has a statement timeout and a bounded response wait and shares concurrent work to avoid accumulating connection probes. It does not certify worker delivery or provider availability. Requests log one JSON event containing requestId, method, status, durationMs and aborted; queries, bodies, credentials, IP addresses and user data are omitted. Unexpected errors log a generic correlated error event. SIGINT/SIGTERM stop HTTP acceptance, drain requests and close Prisma, with a 15-second forced-shutdown deadline.

Future payment sessions need reachable public HTTPS notification/return URLs. Account API-key authentication succeeded and OWNER_ID was filled from the authenticated account user. Actual TEST card payment and full refund were verified; see the current Paymob section above. Payment flags are disabled again after temporary verification.

Verification performed without adding persistent automated test code: TypeScript/ESLint/build, full migration replay and demo seed in an isolated database, HTTP health/readiness/refund authorization, concurrent cancellation and refund issuance with a local fake provider, single send despite repeated calls, exact refund confirmation, seat release, status consistency, notices and retry persistence. Edge checks cover unresolved payment cancellation rejection, timeout without resend, partial refund review and live-role revocation. No real Paymob financial request was sent. Automated regression coverage and GitHub Actions billing remain deferred; production deployment, LIVE onboarding, backups and operational approval belong to the later release phase.

## Deployment preparation and local recovery tools

Dockerfile has separate build, migrations and runtime targets. The final image runs compiled JavaScript as the non-root node user, without CLI/build dependencies. Its health check uses /api/v1/ready. Environment files, local dependencies, Git history, build output and backups are excluded from the build context.

compose.yaml is for local PostgreSQL/Mailpit development only. The repository does not contain a production Compose configuration or a root production environment template. Select the deployment platform before defining production networking, database provisioning, process supervision and restart policies. The API and workers are separate processes; starting HTTP does not start workers. Worker sleeps interrupt on shutdown, but an in-flight batch/SMTP operation may exceed the shutdown grace period and require safe at-least-once recovery.

These files prepare deployment; they do not provision a host, publish a site, obtain TLS certificates or activate LIVE payments. The provider adapter still accepts TEST credentials only.

### Configure and start on an approved server

Use apps/api/production.env.example as the template for host/container environment variables. For the manual Docker examples below, copy it to ignored apps/api/production.env and replace every placeholder. Choose new independent authentication secrets, your deployment database connection string (including provider-required TLS options), HTTPS CORS origins and real SMTP settings. The database must be reachable from the container; localhost inside a container refers to that container. Keep all Paymob flags false while learning. Keep development and production databases separate. The :prod scripts expect environment variables from the host; they do not automatically load production.env.

Run these commands from the repository root after arranging database access and recovery:

```sh
docker build --target runtime -t bus-booking-api .
docker build --target migrations -t bus-booking-migrations .

# Explicit one-shot migration step before starting the application.
docker run --rm --env-file apps/api/production.env bus-booking-migrations

# HTTP process. This loopback binding assumes HTTPS ingress on the same host.
docker run --init --name bus-api --env-file apps/api/production.env -p 127.0.0.1:4000:4000 bus-booking-api
```

These are manual examples, not a platform-specific deployment definition. Open a separate terminal/process for each worker. The same runtime image can run each compiled entry point below. For example:

```sh
# Workers inherit an HTTP health check; disable it for worker processes.
docker run --init --name bus-email-worker --no-healthcheck --stop-timeout 45 --env-file apps/api/production.env bus-booking-api node dist/workers/emailWorker.js
```

| Role                   | Host command from the repository root, after npm run build | Command inside the runtime image       |
| ---------------------- | ---------------------------------------------------------- | -------------------------------------- |
| API                    | npm start                                                  | node dist/server.js (image default)    |
| Email delivery         | npm run email:worker:prod                                  | node dist/workers/emailWorker.js       |
| Booking hold expiry    | npm run booking:worker:prod                                | node dist/workers/bookingHoldWorker.js |
| Authentication cleanup | npm run auth:cleanup:worker:prod                           | node dist/workers/authCleanupWorker.js |
| Payment inquiry        | npm run payment:worker:prod                                | node dist/workers/paymentWorker.js     |
| Refund inquiry         | npm run refund:worker:prod                                 | node dist/workers/refundWorker.js      |

Keep existing source-based commands (without :prod) for development. All five compiled workers support a one-shot run, for example `npm run email:worker:prod -- --once`; use the same `--once` suffix with the corresponding Node command inside a container. `npm run admin:bootstrap:prod -- --email verified@example.com` runs the existing first-super-admin promotion for an active, verified account. `npm run ops:status:prod` runs the compiled operations report. Database archive tools remain host-side utilities requiring the source checkout and Docker; they are not runtime-image worker commands.

Enable payment/refund processes only when their required TEST configuration is ready; starting a worker does not activate payment flags. For every worker container, disable the inherited HTTP health check and configure worker monitoring on the chosen host. API readiness proves database access, not worker delivery or successful provider reconciliation. Production scheduling, restart policy, log limits, resource limits and database recovery still require platform-specific setup.

Migrations are an explicit one-shot deployment step, not run by each API replica. Do not run the demo seed in production. After a backup, apply additive migrations and check readiness before routing traffic. Keep a previously verified image tag for rollback; application rollback is only safe while its database contract remains compatible. Never roll back a schema by dropping financial/history tables.

The API validates production startup before listening: database settings, HTTPS browser origins, independent auth secrets and TLS SMTP must be present; invalid payment activation is rejected. HOST defaults to 127.0.0.1 locally and is overridden to 0.0.0.0 inside containers. TRUST_PROXY_HOPS defaults to 0. Set it to 1 only when exactly one trusted reverse proxy is the only route to the API. Set SMTP_SECURE=true for implicit TLS or SMTP_REQUIRE_TLS=true for mandatory STARTTLS, according to your SMTP provider.

Terminate HTTPS at the trusted ingress. The loopback binding above assumes ingress runs on the same host; use the platform's private networking when it does not. The Next.js website stores its own HttpOnly session cookies and calls the API server-side, so the API does not need to share the website's cookie domain. Configure frontend origins and each deployment environment explicitly. DNS, certificates, real SMTP delivery and external uptime alerts are host/account tasks; this local preparation does not verify them.

### Backup and restore

These host commands require Node.js and Docker Compose. They use PostgreSQL tools inside the running postgres service without passing a password in shell arguments. Backups contain sensitive account/payment history: restrict access, encrypt off-host copies and set a retention policy. The tool does not encrypt, schedule or ship dumps automatically. backups/ and production.env are ignored by Git and excluded from images.

```sh
# Development: choose a fresh output filename; existing backups are never overwritten.
npm run db:backup -- --compose compose.yaml --env-file .env --file backups/bus-2026-10-18.dump
npm run db:restore -- --compose compose.yaml --env-file .env --file backups/bus-2026-10-18.dump --target restore_bus_20261018
```

These commands target the existing development Compose service. Production recovery depends on the chosen database host. The utilities require a Compose configuration with a running postgres service; do not use them for a managed database or an absent production configuration. Verify the selected host's recovery procedure before deployment.

Restore creates a new database whose name begins with restore_. It refuses an existing target and never uses --clean or overwrites the application database. pg_restore runs in one transaction and fails on errors. Verify readiness, table counts and financial/seat state in the restored copy before putting the application into maintenance and switching DATABASE_URL. Resume payment workers only after provider reconciliation; unknown operations must never be resent because a backup was restored. Restore only trusted backups. A failed backup's .partial file is not a completed archive.

### Operational checks and manual financial review

npm run ops:status prints aggregate overdue-mail, payment-review, uncertain-refund and pending-refund counts. Use npm run ops:status:prod after building when running compiled files. Exit code 0 means no listed attention conditions, 1 means operator action is needed, and 2 means the database report is unavailable. It contains no customer data or secrets and sends no provider request. For the manual container names above:

```sh
docker ps --filter name=bus-
docker logs --tail 100 bus-api
docker logs --tail 100 bus-email-worker
docker run --rm --no-healthcheck --env-file apps/api/production.env bus-booking-api node dist/scripts/operationsStatus.js
```

Use host monitoring to check /health, /ready, container restarts and the operations command, and route alerts to a channel chosen by the operator. The operations snapshot is not a worker heartbeat, SMTP delivery receipt, external uptime monitor or bank reconciliation. Durable mail attempts exhausted at five still require operator investigation; a crash can duplicate SMTP delivery, as documented above.

The super-admin POST /admin/refunds/:id/reconcile now also rechecks a REVIEW record using fresh authenticated provider evidence, records the reviewer in the audit log, and only advances it when the exact full refund is proven. Automatic workers continue to leave REVIEW for a human. This endpoint cannot resend money, accept a browser-provided success flag or clear a review merely because the operator clicked it. Manual verification covered a partial refund followed by verified full completion with no second refund POST.

### First Paymob setup

Use the Paymob TEST direct card payments section above. Auth/Capture was removed. The built-in backend return page allows real-provider verification before frontend development. Public HTTPS is needed for every active session; the approved temporary tunnel already passed actual TEST checkout/inquiry/refund verification.

Container verification completed locally with ignored temporary configuration: the runtime image hashed a password successfully as uid 1000, contained no local .env or Prisma CLI, and ran with a read-only root filesystem. The separate migration image replayed all 27 migrations against a fresh isolated PostgreSQL database. The API returned ready with a request ID; its database had no published host port; the operations snapshot returned ok; API/email/booking/auth processes all stopped with exit code 0. Verification containers/network/volume and the temporary restored database were removed; the development database and local backup file were retained. This does not verify public HTTPS, real SMTP delivery or Paymob merchant capability.

## Direct-payment verification — 2026-10-19

Manual isolated PostgreSQL checks cover concurrent checkout/confirmation, single ticket/refund, expiry/reallocation without stealing another booking's seat, mismatched/pending/declined transactions, timeout without resend, HMAC rejection/deduplication, safe browser return, reports and refund notices. No automated test files were added to Git.

The owner approved a temporary Cloudflare HTTPS tunnel. Its local proxy exposed only POST webhook and GET return; public health/bookings paths returned 404. A hosted Mastercard TEST payment for EGP 20.00 completed through the actual merchant Integration ID. The actual HMAC callback was accepted, fresh inquiry confirmed a standalone TEST payment, and one CONFIRMED booking / SALE / Ticket was persisted. Super-admin operator cancellation then created a full refund debt; the actual refund API and inquiry returned SUCCEEDED for all 2000 piastres. Ticket/cancellation/refund emails were confined to local Mailpit.

Real-provider checks uncovered two issues fixed before handoff: normalize PostgreSQL timestamp strings to ISO before input validation; and reject new checkout creation when fewer than Paymob's minimum 60 seconds remain. The temporary tunnel is for development only; each later session needs a new reachable HTTPS URL. Local checks do not prove production/LIVE readiness. Authenticated inquiry reported is_3d_secure=true, and the successful sandbox card completed without an OTP challenge. No separate declined-card/OTP challenge was produced; those account-specific provider simulations remain unverified while their backend rejection paths are checked locally.

Actual provider expiry was verified separately: Paymob displayed Link has expired for a short-lived TEST Intention; the API returned 409 BOOKING_EXPIRED. All 28 migrations replayed in a fresh isolated database; a second migration run applied zero. Final manual regression included 12 scenario groups. The migration was applied to development after a private backup. Temporary verification databases were removed, synthetic users were disabled and their sessions revoked, test trips closed with financial/audit history preserved, and the tunnel stopped. Local payment activation flags were returned to false. Starting another TEST session requires a new reachable HTTPS address and explicit local activation.

## Passenger website (local development)

The passenger frontend lives in apps/web. Run these commands in separate terminals from the repository root:

```powershell
npm run dev
npm run dev:web
npm run email:worker
```

Open http://localhost:3000/ar (or /en). Keep Docker PostgreSQL/Mailpit running. The email worker delivers registration verification codes to local Mailpit at http://localhost:8025. All previous accounts were removed by the owner-requested local reset; register a new account and verify its email before booking.

The website supports city/station search, trip results, a physical 2+2 seat map, multi-seat selection, login/registration/email verification, passenger details, a ten-minute server-side seat hold, booking history and owned booking/payment status. Seat availability refreshes periodically and is rechecked before reservation. A seat conflict is handled from the API; selection does not reserve a seat.

Interactive browser requests, including payment status polling, use same-origin Server Actions. API_BASE_URL is the server-only backend address (default http://127.0.0.1:4000/api/v1); SITE_ORIGIN is the website origin. Configure apps/web/.env.local when overriding them, and include the website origin in API CORS_ORIGINS.

The payment action checks GET /payments/availability before allowing checkout. This endpoint reports local configuration only, not live provider health. With checkout disabled the server returns PAYMENT_UNAVAILABLE. No browser calculation confirms payment or issues a ticket. Account passwords/tokens and passenger names are not persisted in browser storage.

### Temporary local Paymob TEST ingress

Run `npm run payment:proxy` beside the API on port 4000 and website on localhost:3000. The development-only proxy binds 127.0.0.1:4010 and allows only POST /api/v1/payments/paymob/webhook and GET /api/v1/payments/paymob/return; other routes return 404. The return redirects to the local payment-result page and ignores callback query values. Only the authenticated payment inquiry can confirm a booking.

Forward a temporary HTTPS tunnel to this restricted proxy, verify reachability, and update PAYMOB_NOTIFICATION_URL and PAYMOB_RETURN_URL in apps/api/.env with its current HTTPS address. Temporary addresses expire when their tunnel ends and may change. Keep credentials local. Validate with `npm run payment:check`, keep `npm run payment:worker` and `npm run refund:worker` running, and restart the API after changing environment settings. Enable the existing TEST checkout, provider, webhook, reconciliation and refund flags only while this configuration is ready. Set them back to false when ending the experiment. Do not extend an expired booking: select seats again if its hold has elapsed.

### Passenger payment result and ticket

New TEST checkout sessions return directly to the website /ar/checkout/result?bookingId=<UUID>. The API supplies the owned booking id. Legacy tunnel-based return URLs without an id still link to My bookings. Provider callback success values are ignored.

A paid, confirmed booking exposes View ticket, opening /ar/bookings/<UUID>/ticket (also available in /en). The protected API supplies the journey, passengers, seats, paid total and PNG QR. Missing, unpaid, cancelled or inaccessible tickets show an unavailable state. Ticket status is rechecked on focus and every 30 seconds while visible; it is a current status display, not an offline validity or boarding guarantee. Payment states distinguish pending verification, failure, expiry, review and full refunds. Do not repeat a payment while its result is unknown.

### Direct browser return during local TEST payments

PAYMOB_RETURN_URL is now the passenger website result URL, for example http://localhost:3000/ar/checkout/result in local development, or https://your-website.example/ar/checkout/result in production. The API appends bookingId from the authenticated, server-owned booking when creating each new Intention. Paymob redirects the browser there directly, independently of the webhook tunnel. The page reads the owned booking/payment API; provider success flags are ignored.

HTTP return URLs are permitted only for loopback hosts in development/test; production return URLs and all notification URLs require HTTPS. Localhost works only when the payment browser is on the same development computer. Keep the HTTPS webhook tunnel and payment inquiry worker available during TEST verification. Existing Intentions retain their original redirect URLs; do not recreate or repay a completed or uncertain payment just to change its return URL.

The complete STANDARD_2_2 44-seat website template includes a front door, WC opposite seats 17–18, a middle door opposite 19–20, and four-seat rows continuing from 21–24. These fixed noninteractive markers do not create or renumber database seats. The same physical positions are retained in Arabic and English. Other capacities keep regular 2+2 positioning; undefined layouts show numbered availability only.

After checkout, the website can POST an empty JSON object to /bookings/<UUID>/payment/refresh to verify the owned existing payment immediately, without waiting for the periodic worker. The route is authenticated and limited to six calls per minute per user. It never creates a payment or issues a refund. GET /bookings/<UUID>/payment stays a provider-free status read. The result page performs one check and invalidates its query as soon as it finishes; provider errors fall back to normal polling/worker recovery. Provider response time still governs when confirmation can be displayed.

### Passenger password recovery

Use Forgot password on the login form, or /ar/forgot-password (/en also supported). Enter the account email to request a six-digit code. The same form then accepts the code and a matching new password of 12–128 characters. /ar/reset-password supports entering an already received code directly. Codes last ten minutes; requesting a new one replaces the old code, with the existing backend resend/attempt limits enforced. Generic request messages do not disclose whether an account exists.

Keep the local email worker running and read development messages in Mailpit. Passwords and codes stay in form memory and are cleared after success; no automatic login follows a reset. Existing account sessions are revoked by the API, and the website clears its local session/cache before offering sign-in with the new password. A validated internal returnTo preserves the prior destination; email/code/password values are never carried in that URL.

### Passenger account

/ar/account and /en/account read the signed-in passenger's name, email and phone on the server through authenticated GET /auth/me and render the details in the initial HTML. Shared account navigation links the profile and booking history. Guests see sign-in with a return path to their account.

Sign out ends the current session. Sign out of all devices asks for confirmation and calls authenticated POST /auth/logout-all, including the current session. Successful logout clears HttpOnly cookies/private query state and refreshes the server-rendered view. Errors remain visible without pretending the request succeeded. Profile editing and a device inventory are not currently supported.

### Website authentication and role-protected routes

Interactive reads and writes use feature TanStack hooks and Server Actions through the server-only apiFetch transport; Server Components prepare initial data through the same transport. Payment polling uses getPaymentStatusAction; the former website payment Route Handler and generic API gateway are deleted. Provider callbacks remain in Express.

Access and rotating refresh credentials remain in HttpOnly, host-only web cookies (development bus_web_access/bus_web_refresh, production __Host-bus_access/__Host-bus_refresh with Secure, SameSite=Lax, Path=/). Access lasts 15 minutes; refresh retains backend session expiry. Neither token is returned in browser JSON, hydrated query state or browser storage. shared/lib/api.ts exports one HTTP function, apiFetch, which always returns { result, headers }. Ordinary callers return result; login/refresh also read the server-only headers for Set-Cookie. Raw Headers never enter Server Action results. It sends explicit credentials only to fixed API_BASE_URL. features/auth/lib/auth.server.ts owns cookie extraction/storage and session renewal; auth Actions return safe user data. Server Components never write cookies or refresh sessions during rendering.

The locale layout hydrates one safe { user, error? } session view into a request-local TanStack Query cache. useAuth shares authKeys.me and refetches through getCurrentUserAction. QueryCache and MutationCache centrally handle confirmed UNAUTHENTICATED failures, cancel pending queries, remove previous-account data and refresh server content. Invalid login credentials, 403 and transient failures do not sign the user out. Seat selection stays in local useState; RHF owns form fields and URL parameters own search/filter state.

src/proxy.ts keeps the ordered authMiddleware -> intlMiddleware chain and roleRoutes table. When session cookies are present, authMiddleware calls GET auth/me through readWithSession to obtain the current backend session and database role, then applies roleRoutes. No local JWT role verification or web signing key is needed. Missing/expired access renews through the shared single-flight helper and retries the read once. New cookies reach the current render and browser response. Confirmed invalid sessions clear cookies and redirect protected requests to localized login with returnTo; disallowed roles redirect to forbidden. Backend outages fail closed with 503 and preserve the session. If rotation succeeded before the next read failed, the 503 response saves the new cookies. Public guest pages skip the middleware lookup. Private readers/Actions and Express retain their own authorization checks.

Payment detail/result pages start with a server snapshot of booking, payment and checkout availability, immediately showing confirmation if the backend already confirms it. Provider query flags never decide success. TanStack Query polls the dedicated GET while payment/refund remains pending; a fresh server snapshot wins over older cache, and older GET responses cannot overwrite a newer reconciliation result. The GET endpoint only reads status and availability; it never creates payment, reconciles with Paymob, captures or refunds. It omits checkout URLs and token credentials, rejects malformed/cross-site requests, preserves safe Retry-After/error metadata, and can renew a session through authenticatedFetch. A single explicit reconciliation Action on return remains separate from polling and is not automatically replayed.

Configure server-only API_BASE_URL and SITE_ORIGIN for the website. AUTH_ACCESS_SECRET belongs to the backend and is no longer required by the website. SITE_ORIGIN must be the website HTTPS origin and be allowed by backend CORS/session policy. Server Actions retain Next's POST/origin checks and server-side input/session/permission checks; apiFetch sends the backend CSRF header. The dashboard will have an independent first-party session on its own domain.

The in-flight refresh Map merges matching calls only within one runtime. Express coordinates concurrent rotation using its existing PostgreSQL session lock and bounded 30-second successor recovery. This does not allow arbitrarily delayed reuse; old-token requests outside that window remain subject to replay revocation. Configure trusted ingress/client identity as described under local auth reliability below; no rate limit or backend policy changed in this simplification.

### Website source structure

```text
apps/web/src/
  app/                       Thin routes, layouts, providers
    api/payments/[bookingId]/status/  Fixed GET payment polling
  features/
    auth/                    actions, hooks, components, schemas, types, lib
      lib/auth.server.ts     Cookies, renewal, protected requests and SSR reads
    trips/                   actions, hooks, components, schemas, types, lib
    seats/                   actions, hooks, components, schemas, types
    bookings/                actions, hooks, components, schemas, types, lib
    tickets/                 actions, hooks, components, types, lib
    account/                 Account profile/navigation
  shared/
    lib/api.ts               Server-only HTTP transport; no session decisions
    lib/apiResult.ts         Shared results, errors and invokeAction
    lib/queryClient.ts       General TanStack settings
    components/              ui (shadcn), forms, layout, feedback
  middleware/                Role routes, auth, locale and middleware runner
  proxy.ts                   Runs the middleware chain
```

The consolidated current plan is in IMPLEMENTATION_PLAN.md. The dated migration entries below record earlier steps and may mention filenames that were replaced by the current structure.

### Authentication Server Actions (2026-10-20)

Login, registration, email verification/resend, password recovery/reset and current/all-device logout now run through features/auth/actions/auth.actions.ts. Each exported action validates its input on the server before calling the fixed backend path through apiFetch. Login/refresh credentials are saved through the shared HttpOnly cookie writer and never returned in action data. Logout-all authenticates the live user inside the action through apiFetch's auth/me preflight; current-device logout uses the backend refresh credential. Public registration/recovery actions intentionally do not require a signed-in user. The backend retains its authoritative validation, rate limits and session enforcement.

The flow is form/React Query mutation -> auth.api adapter -> Next Server Action -> apiFetch -> Express. Next supplies the POST action endpoint and same-origin checks; the browser no longer calls the generic gateway for these mutations. The adapter converts serialized failure results to the same ApiError used by the forms, preserves confirmed-session-expiry cache handling and marks a lost action response as an uncertain NETWORK_ERROR without retrying. Registration still returns verificationId; login still returns only the user. Existing forms and disabled/pending feedback are retained. auth/me is temporarily still a browser GET through the gateway; it will move with the server account/session reads. Other feature gateway calls remain until their migration.

Production build, TypeScript and ESLint passed. Isolated checks covered all seven actions, runtime validation, cookie writes/clears, guest logout-all denial and refresh-before-write. Actual HTTP calls to a temporary production Next server with a fake API verified ar/en forwarding, HttpOnly/Secure cookies, token redaction, direct guest invocation from a public URL, logout/reset cleanup, cross-origin rejection and no retry on an uncertain network outcome. Client adapter checks preserved existing result/error contracts. No real accounts, provider transactions, database writes, dependencies or saved test files were added.

### Booking and payment Server Actions (2026-10-20)

features/bookings/actions/bookings.actions.ts now handles reservation creation, checkout and the explicit payment inquiry. Each validates its input at the server boundary. Reservation payloads accept only tripId, contactPhone and distinct seatId/name pairs, never a client owner or price. apiFetch authenticates the live session before the reservation is sent once. Checkout and inquiry also read bookings/:id inside the action to verify ownership before proceeding; Express rechecks ownership and payable state on every mutation.

Checkout validates the client-generated UUID Idempotency-Key, prepares the payment attempt when needed, then requests the existing backend checkout operation. The same key is forwarded as a header for that invocation. Only the known 409 PAYMENT_ATTEMPT_EXISTS response permits continuing with an existing attempt; expired bookings, other errors and uncertain network/5xx outcomes stop the action. Preparation and checkout writes are not automatically repeated. No payment price, currency, provider API or backend booking/concurrency rule changed. Payment inquiry performs one explicit reconciliation; repeating status reads are still GETs and await their dedicated polling-route migration.

The existing reservation data wrapper, checkout URL handling, seat invalidation and UI remain compatible. Auth and booking adapters now reuse invokeAction in shared/lib/apiClient.ts, preserving ApiError, expired-session cache events and uncertain NETWORK_ERROR without duplicating the adapter. Reservation/checkout mutation hooks explicitly disable retries. No feature mutation still calls apiClient.post/patch/put/delete; the generic gateway remains for transitional reads.

Validation passed: TypeScript, root ESLint, production web build, isolated action/adapter scenarios and actual HTTP action requests to a temporary production Next server with a fake API. Covered direct guest calls from a public trip page, ownership denial, expired-session renewal before creation, seat conflict, exact key forwarding, existing-attempt continuation, expired/uncertain preparation blocking checkout, one checkout on a lost response, owner-only inquiry, ar/en messages and CSRF rejection. No real reservations, Paymob transactions, database changes, saved tests or dependencies were added.

### Account, booking history and ticket server reads (2026-10-20)

The private layout checks getCurrentUser through apiFetch on the server. React cache deduplicates this lookup only within a render, never across visitors. Booking and ticket readers call requireCurrentUser before fetching private data as well: Next can begin page and layout work in parallel, so the layout alone is insufficient as a data-read guard. Express still authenticates and enforces ownership on each request. AccountPage passes only the selected user fields to the interactive profile; booking history and ticket markup are Server Components. The raw QR payload is not sent as a Client Component prop.

The proxy's internationalization middleware overwrites an internal x-bus-return-to request header with the actual internal path/query. A revoked live session redirects to localized login with this safe returnTo, even while the JWT remains locally valid. Backend outages render a recoverable ReadError with a page-refresh button and optional support id; they do not clear session cookies. Successful existing-session login-page visits redirect on the server. Successful form login navigates with the validated return path, avoiding redirects driven by stale browser auth cache.

History pagination uses /bookings?offset= with a validated 0-100000 offset and 20-row backend pages. Ticket refresh uses router.refresh to rerun Server Component reads, manually and every 30 seconds/on window focus while visible; no read Server Action or additional API route was added. Shared RefreshPage and ReadError preserve interactive refresh/error handling. The old useBookings list query, tickets.api.ts/useTicket and their unused query keys were removed. Existing booking detail/payment polling, browser header/session and seat queries still use the legacy gateway until the next migration; it has not been deleted.

Production web build (including TypeScript) and root ESLint passed. Actual HTTP checks against a temporary production Next server with a fake API covered initial account/history/ticket HTML without browser fetch, two simultaneous user identities, one auth/me per render, proxy renewal visible to the same server render, minimal user/QR serialization, pagination/empty states/404, guest and revoked sessions, spoofed return-path header rejection, outage support-id rendering without logout, safe login redirects and current logout cookie clearing. No real users, bookings, provider transactions, database changes, dependencies or saved tests were introduced.

### Final auth/API migration completed (2026-10-20)

Deleted the generic gateway and remaining browser auth/trip read modules. Session view is server-hydrated through TanStack Query without credentials or a duplicate store. Booking detail and payment result start from private server reads; the single GET status route supplies later payment/availability updates. Seat selection persists in Zustand across visible/manual server refreshes. Writes, provider inquiry and checkout remain Actions with retries disabled and exact Idempotency-Key behavior unchanged. A newer confirmed state cannot be replaced by an older in-flight status read. Focus refresh is coordinated once for the whole page.

Production build/TypeScript and root ESLint passed. Actual HTTP checks with a temporary fake API covered immediate paid SSR, pending-state safety despite provider query flags, owner/session/cross-site/UUID/method rejection, 404 for the removed gateway, six concurrent status callers sharing one renewal in that runtime, HttpOnly redaction, transient/invalid refresh, Retry-After/requestId handling, public-page renewal and two-user isolation. An inline ordering check verified older pending reads do not replace paid results and pending refunds continue polling. In a separate Chrome tab on the sandbox server, login returned directly to confirmation, selection survived a server seat refresh, passenger details appeared from the hydrated session, a fake reservation navigated to details, explicit inquiry confirmed the fake result, and logout returned to login preserving returnTo. No hydration errors were observed. Temporary processes/tab were closed; no real reservations, Paymob traffic, database data, dependencies or saved automated tests changed. The runtime-only/late-token coordination limitation remains a production deployment decision.

## Current frontend architecture (2026-10-20)

The authoritative current plan and implementation progress are in IMPLEMENTATION_PLAN.md under "الخطة الموحدة لواجهة الركاب". Earlier migration notes above describe historical intermediate states.

Interactive requests follow component → feature hook (TanStack) → specific Server Action → auth.server for protected operations → shared/lib/api.ts → Express. HTTP configuration and envelope parsing stay in api.ts; cookies, read renewal and write preflight stay in features/auth/lib/auth.server.ts. apiResult.ts holds serializable results and invokeAction error conversion. The old session.ts and refreshSession.ts files are merged into auth.server.ts. Middleware continues to read the current role from backend auth/me.

TanStack owns the API data cache. HTTP fetches use no-store. Internal feature lib/*.server.ts readers prepare initial SSR data through the same central transport; they never write cookies during render. Protected read Actions use apiFetch after Proxy session renewal. The browser Action transport is POST even when Express receives GET. getPaymentStatusAction reads owner-scoped stored payment status and availability; it does not contact Paymob itself.

Query keys include locale and private owner identity where relevant. Login/logout clear previous query data. No access or refresh credentials enter query data or Action results. The QR view receives its image without a separate raw payload field.

The request/data foundation and shared UI/forms foundation are implemented. Existing login/register/verification/recovery, search and passenger forms now use shared RHF/Zod components built on shadcn. All passenger screens now use inline Tailwind utilities, including seats, booking/payment, account/history and tickets. globals.css contains theme/base rules and reduced-motion support only; the broader UX review remains separate. Runtime-local refresh single-flight still requires a separate deployment coordination decision for multiple runtimes or late old-token requests.

### Shared UI and forms

components.json directs shadcn components to shared/components/ui. shared/lib/cn.ts combines clsx and tailwind-merge. shared/components/forms/Form.tsx owns the RHF instance, Zod resolver and submit-error handling; FormInput/FormSelect connect typed fields to shadcn Field/Input/NativeSelect; SubmitButton uses the same form's pending state. Each feature keeps its own schema, Action, query hook and success navigation.

Form submissions await the feature's mutateAsync. Zod validates in the browser and Actions validate again on the server. Input/output types remain distinct for schema transforms. Passenger fields stay mounted while seats change, and removed seat fields unregister without resetting remaining names. There are no saved automated test files.

Use @hookform/resolvers 5.9.2 with this RHF7/Zod4 dependency set; version 6 currently resolves incompatible optional peer dependencies in this project. No force/legacy-peer-deps override was applied. The current progress and remaining CSS/UI stages are recorded in IMPLEMENTATION_PLAN.md.

### Trip search UI migration

HomeContent, TripResults, TripCard and TripDetails use inline Tailwind and shared shadcn buttons. QueryError owns recoverable query feedback; EmptyState owns empty/error presentation. Features still own query hooks and messages. Search keeps Cairo dates, city/station filters and 20-row pagination. SSR failures use RefreshPage to retry the current route. Base CSS now lives in @layer base so utilities can override defaults; 124 obsolete trip selectors were removed. No data/auth/payment rules changed. See IMPLEMENTATION_PLAN.md for validation and remaining UI stages.

### Inline styling completed (2026-10-21)

All remaining component CSS classes have been removed from globals.css and replaced with Tailwind utilities in JSX. Heading/text/icon styles sit on their elements. Shared Button handles action controls and links; size="lg" owns the repeated large-button dimensions. Seat row/column styles still come from the existing seat-number layout function. Data fetching, authentication, payment transitions and booking rules are unchanged. Production build, ESLint and temporary fake-backend browser checks passed; no saved tests or real transactions were added.

### Backend-authoritative route checks (2026-10-21)

The owner retained TanStack + Server Actions for interactive API work and selected live backend role checks in middleware. authMiddleware now uses the central apiFetch GET auth/me; role changes and session revocation affect the next server check without waiting for JWT expiry. jose is no longer a direct web dependency, and web deployment does not need the API signing secret. The tradeoff is a backend lookup for middleware requests carrying session cookies, in addition to independent SSR/Action checks. Single-flight remains runtime-local. ESLint, production build/TypeScript, 17 isolated middleware checks and 7 actual HTTP production checks with a fake API passed. No real users, database or payment state changed.

### Auth/API requirements audit (2026-10-21)

The root implementation plan now maps every auth/API requirement to its implemented, superseded or deployment-pending state. The user-selected pattern remains TanStack + Server Actions for interactive reads/writes, with backend-authoritative middleware roles. Removed duplicate auth/booking validation result construction in favor of the existing shared validationError helper. Static inspection found 84 literal response/error codes with translations and no direct controller JSON responses. Sixteen isolated Express HTTP scenarios verified bilingual envelopes, parser/validation failures and support-id handling; seventeen API/Action scenarios verified session/redaction/refresh and no uncertain-write replay after cleanup. Multi-runtime/late-token refresh coordination remains a deployment decision; no grace window or token model change was added.

### Refresh helper separation (2026-10-21)

shared/lib/refreshSession.ts now owns refresh-token validation, the auth/refresh operation, response-token extraction and runtime-local single-flight coordination. api.ts keeps the sole backend HTTP transport and passes it into the helper, avoiding duplicated configuration and circular imports. apiFetch still decides when renewal is appropriate, writes cookies through session.ts, and retries a confirmed unauthenticated GET once. apiResult.ts supplies shared local failure results. No token credentials enter browser ApiResult data and uncertain writes remain unreplayed. The source specification is applied with the owner-approved TanStack/read-Action and backend-role amendments; multi-runtime/late-token refresh coordination remains unresolved.

### Shared Action input parsing (2026-10-21)

shared/lib/parseSchema.ts validates Action inputs with safeParseAsync and preserves the schema output type, transformations and defaults. Success returns { success: true, data }; failure returns { success: false, error } with one localized ApiResult validation message and no Zod issues or submitted values. Auth/bookings/trips/seats/tickets Actions use this helper and send parsed data to apiFetch. Feature schemas remain local, including numeric booking pagination limits. Browser forms retain the RHF resolver; backend-response validation keeps its distinct upstream error semantics. Ten parser/Action scenarios and seventeen API/Action regressions passed with no real service calls or saved repository tests.

### Local auth reliability fixes (2026-10-21)

This update supersedes earlier strict-immediate-replay and deployment-pending refresh notes. PostgreSQL's existing Session row lock coordinates all API replicas. Each successful rotation derives one immediate successor using a domain-separated HMAC under the API signing key; only token hashes are stored. All replicas must share the same signing key, as already required for JWT validation. No database migration or plaintext token storage is needed.

A used refresh token may recover that exact successor for at most 30 seconds after its original usedAt, only while the successor is still unused and unexpired and the user/session remain active. Recovery does not create another RefreshToken, extend usedAt, or extend the session expiry. Outside the window, or after the successor has itself rotated, reuse revokes the session. This deliberately trades immediate replay detection for a bounded concurrency overlap: a stolen bearer token can also be reused during those 30 seconds. It does not solve arbitrarily delayed requests. Old rotations created before this update have no recoverable derived successor and still fail closed. The web Map remains an optimization, not the cross-replica guarantee.

useAuth now recognizes TanStack query errors as unavailable and retries the session query before refreshing server content. Backend requests combine the caller's AbortSignal with their independent 20-second deadline; protected writes still execute once and uncertain writes are not replayed.

Passenger booking/checkout/status/ticket limits now use the authenticated user id. Public auth/session/recovery limits can distinguish clients behind Next using a signed IP context bound to timestamp, HTTP method and exact request URL. Configure an independent 32-byte hexadecimal API_CLIENT_CONTEXT_SECRET on API and Next, and TRUSTED_CLIENT_IP_HEADER (for example x-real-ip) on Next. The ingress must overwrite that header with one validated client IP and prevent direct Next-origin access; never trust arbitrary browser X-Forwarded-For. Missing or invalid signatures fall back to the API's normal trusted-network IP and do not grant a separate quota. With the feature disabled, anonymous callers behind Next still share its network quota. Production ingress settings cannot be inferred from local code and require explicit deployment configuration. No real secrets are added to example files.

Rate-limit counters remain process-local. Multi-API deployments must use a shared limiter store or a trusted ingress enforcing the intended aggregate limits; signed client identity fixes attribution, not distributed counter storage. Keep direct API exposure restricted. No provider/payment behavior is changed.

### Payment status input validation (2026-10-21)

The payment-status GET handler shares parseSchema with feature Actions. Its feature-owned schema validates the booking UUID and rejects query parameters. The handler supplies its request language explicitly; Actions keep using the current page locale. Validation stays one general message with no submitted values or Zod issues, including Arabic regional locales. Authentication, CSRF, HttpOnly renewal, private no-store responses, and checkout URL redaction remain in place. TypeScript, ESLint, production build and 27 temporary isolated checks passed; no DB or Paymob calls or repository test files were added.

### Web structure simplification (2026-10-21)

All 15 app pages render on the server and supply initial feature data. Static login/account/booking and public-page content now stay outside client interaction boundaries. Feature hooks share hooks/queryKeys.ts; global query/mutation retry settings live in queryClient.ts. Six one-use wrapper files were inlined; seat logic moved into useSeatBooking and live payment logic into useBookingPayment. Auth-dependent navigation is composed by the layout, so shared UI no longer imports feature internals. Component styling uses inline Tailwind utilities, with only theme/base/keyframes in global CSS. Auth/session/redirect protection and payment ordering/idempotency are retained. See the current feature table and audit in IMPLEMENTATION_PLAN.md for exact responsibilities and verification.

### Consistent password recovery forms (2026-10-21)

PasswordRecovery is a server-rendered screen. PasswordRecoveryFlow contains the email request form and selects the request/reset/success step. ResetPasswordForm contains the password fields and local resend controls. These three files use the same shared Form controls and mutation-hook pattern as LoginForm/RegisterForm. The schema factory only customizes the localized password-mismatch message; constraints remain shared with server validation. useResetPassword clears session query data on success, so forms no longer read the current session merely to clear it. Resend cooldown, returnTo and uncertain-result handling are retained. Verification used isolated fixtures without changing any real password.

### Frontend state ownership without Zustand (2026-10-21)

Zustand is removed from the website dependencies. The current-user view has one shared TanStack Query cache at authKeys.me; login updates it and logout/session expiry/password reset cancel queries and remove previous-account data. AccountProfile reads that same cache. Server rendering seeds safe user data per request through HydrationBoundary, with credentials remaining in HttpOnly cookies. Seat selection is local useState in useSeatBooking: valid available seats are restored after login, toggles preserve the mounted passenger form, failed reservations retain the draft and successful reservations clear it. React Hook Form owns field state, and URL parameters own shareable search/filter state. Earlier historical Zustand references are superseded by this decision. No profile-editing endpoint, API transport redesign, or backend change is included.

### Simplified API and auth flow (2026-10-22)

The current responsibilities above supersede the earlier separate session/refresh helper design. Login validates input, requests Express once, saves validated credentials as HttpOnly cookies and returns only the user. Protected Actions use authenticatedFetch: reads may refresh and retry once on confirmed UNAUTHENTICATED; writes verify/renew via auth/me first and send the mutation once. SSR uses readApi without writing cookies; proxy renews before rendering and forwards the new pair to both that render and the browser. Temporary failures preserve the session, including a successful rotation followed by a failed read.

Cookie deletion sets both Max-Age=0 and an explicit past Expires, so Next forwarding proxy cookies into an Action response cannot recreate empty session cookies. QueryCache/MutationCache replace the global session-expired window event. Payment reconciliation uses useMutation so it follows the same error path; its GET polling and response-order protection remain. No new dependency, backend change, endpoint migration or payment policy change is included.

Validation: 38 isolated server/action/proxy/handler checks, 8 query-cache checks and 15 Chromium checks against the production build and a synthetic API. TypeScript, repository ESLint and the production build passed; the cloud build used official Node 24 Docker because the host filesystem ownership prevented SWC's protected native cache initialization. No real users, mail, DB or payment provider were touched by these checks. General formatting has pre-existing repository warnings; no automated test files were added to Git.

### Passenger account menu and profile editing (2026-10-22)

The header now has an accessible avatar dropdown using the existing Radix dependency, with a shared local default avatar. Account and booking-history pages share AccountLayout; session actions live at /account/security. /account edits name and international phone through PATCH /api/v1/auth/me. Send only a JSON object with name and phone, with the normal Bearer token and X-CSRF-Protection: 1 (and an allowed Origin when present). Email, role, passwords and client-selected user IDs are rejected. The response contains the safe updated user in the existing API envelope; the website updates authKeys.me without clearing booking data or allowing a late response to restore another account. Existing reservation passenger/contact snapshots are unchanged. No migration or profile-photo upload is required. Payment history remains the next account feature; no inactive menu link is shown.

### Passenger payment and refund history (2026-10-22)

GET /api/v1/account/payments is authenticated and read-only. It accepts only limit (1–100, default 20) and offset (0–100000, default 0); ownership comes from the live session, never a query userId. The response data contains items and pagination { limit, offset, hasMore }, ordered by attempt createdAt and id descending. Each item is one existing payment attempt with the safe booking reference, amount in piastres, payment/booking status and optional refund status/amount/timestamps. Provider credentials, checkout links, events and customer details are omitted. It reads existing records without contacting Paymob or changing payment/refund state; no migration is required.

The protected /ar/account/payments and /en/account/payments pages are linked from the avatar and account navigation. Server rendering supplies the initial snapshot; validated Server Actions and user/locale/page-scoped TanStack keys handle refreshes. The page explains that attempts do not imply charges, distinguishes pending and completed refunds, supports accurate next-page visibility, empty/error/loading states and Cairo times, and never offers cancellation or refund issuance. Verification used 35 isolated scenarios plus production-build browser fixtures, without a real database/provider call or saved repository tests. The pre-existing useSeatSelection.ts unknown ESLint-rule comment still prevents the repository-wide lint command; feature-file lint and TypeScript/build checks passed.

### Passenger booking-history filters (2026-10-22)

GET /api/v1/bookings?filter=upcoming&limit=20&offset=0 accepts all (default), upcoming, past, expired and cancelled. Ownership always comes from the authenticated user. Upcoming means an active reservation on a future scheduled trip; past means a confirmed booking whose scheduled departure has arrived. Expired includes overdue pending holds even before the expiry worker runs. Operator-cancelled trips appear only under cancelled. Processing payments after departure remain in all. One server timestamp is used for filtering and status serialization.

Filtering happens in the database before pagination. The existing items/pagination response now includes pagination.filter and pagination.hasMore; one extra row determines whether another page exists. The website preserves filter and offset in the URL, resets offset when switching filters, and isolates TanStack keys by user, language, filter and page. New server snapshots take precedence over older cached results; a failed refresh keeps the displayed data and offers retry. No migration, payment-provider request or reservation mutation is needed.

API/web TypeScript, feature-file ESLint and the production build passed. Thirty-three isolated checks and a production-build browser preview covered ownership, time boundaries, pagination, filter navigation, reload/back, empty/error/retry states, Arabic and mobile layout. Checks used synthetic data without DB/Paymob calls or permanent test files. The previously documented repository-wide ESLint issue remains separate. Booking filters complete phase C; ticket printing is next, followed by policy pages and UX review.

### Passenger ticket printing (2026-10-22)

The existing ticket page now offers Print ticket in Arabic and English. Each click re-reads the owner's ticket through the existing authenticated Server Action; cancelled/unavailable tickets and failed reads remove the old ticket and cannot print it from cache. The hook renders the verified response, waits for fonts and QR decoding, then calls window.print. afterprint clears the temporary print snapshot. Direct Ctrl+P shows instructions to use the verified print button. The existing QR meaning and boarding checks remain unchanged: a printed copy cannot guarantee the ticket remains valid later.

The paper layout hides site navigation and interactive controls, uses A4 with 14mm margins and a 55mm QR, and allows passenger rows to continue across pages. Styling stays in Tailwind utilities except the print page/shell rules. The browser can save the print as PDF; no PDF endpoint, dependency, migration or backend policy change was added.

Web TypeScript, feature-file ESLint and production build passed. Sixteen Chromium checks used a synthetic API, including refusal after cancellation/failure, corrupt QR, retry, Arabic RTL and mobile layout. Temporary A4 PDF previews were rendered and reviewed: one page for normal tickets and three nonblank pages for 44 passengers. Automation intercepted window.print and separately exercised the browser print CSS/PDF output; no physical printer, real database/provider call or permanent test file was used. Phase D is complete; terms/privacy drafts and links are next, then the broader UX review.

### Current web API and session flow (2026-10-24)

All Features, server pages and middleware import apiFetch from shared/lib/api.ts for backend HTTP requests. It attaches the current access cookie (or the explicit access token supplied by Proxy), sends once, and returns ApiResult<T> directly. It never refreshes tokens, writes cookies, or retries a request. Simple Actions return apiFetch directly; login saves tokens in HttpOnly cookies and returns success without token or user data.

Proxy covers page URLs and excludes /api, framework assets and files. Every matched request uses authMiddleware followed by intlMiddleware, including Server Action POSTs on page URLs. There are no web Route Handlers. Payment status follows the same TanStack Query → invokeAction → getPaymentStatusAction → apiFetch flow as other feature reads.

Only authMiddleware renews an expired session: read cookies, call backend auth/me, exchange the refresh token on a confirmed UNAUTHENTICATED response, and verify the renewed access token. It forwards both new cookies to the downstream request and sets HttpOnly cookies on the response. Login/reset/logout still manage their own session creation/removal. Protected navigation redirects unauthenticated users to login with returnTo; verification outages return 503 without clearing a valid session. Action POSTs continue after a failed middleware session check so that the backend returns its own authorization/error result through the Action transport; invokeAction and the existing auth error handler process it. Server Actions retain Next.js origin validation, while Express independently checks authentication, roles and ownership for every protected operation.

The backend still authenticates and authorizes every protected read/write. If a token expires or is revoked after Proxy verification, apiFetch returns the backend error without renewing or replaying the operation. There is no refreshSession option or Action-specific request wrapper. Backend requests remain no-store; TanStack owns browser data caching.

authMiddleware calls apiFetch('auth/me'), calls apiFetch('auth/refresh') directly when access is rejected, saves/forwards new cookies, and checks the backend user's role. There is no isApi branch, separate refresh function, status/code staging, or second network-error handler. One local reject helper creates a redirect or temporary error response and carries any renewed cookies across it.

useBookingPayment retains the existing 3/5-second polling intervals and terminal-state stopping conditions. Query cancellation ignores an outstanding Action result; it cannot abort the server-side Action HTTP request. The timestamp comparison prevents an older poll from overwriting newer reconciliation data. Status reads omit checkout URLs and never call Paymob; refreshPaymentAction remains the separate reconciliation operation.

shared/lib/session.ts owns cookie settings and token validation. features/auth/lib/auth.server.ts exports the render-deduplicated getSignedInUser reader; callers needing user.id handle a missing user directly. Proxy no longer maintains an in-flight refresh Map; simultaneous requests may each call refresh. The backend coordinates rotation through its Session row lock and bounded 30-second immediate-successor recovery described above; this change does not alter that policy or extend the recovery window.

### Session response simplification (2026-10-23)

This supersedes the earlier Set-Cookie response parsing described above. Backend login and refresh now return only accessToken, expiresIn, refreshToken and refreshExpiresAt in JSON data. User information comes from auth/me. Login uses a TypeScript response type and saves tokens directly, without a Zod response schema. A missing data payload is handled as an upstream error. Proxy still validates refresh tokens with tokensSchema in session.ts. Proxy ignores user data in the refresh response and verifies the user and role through auth/me. Login saves HttpOnly cookies and returns a success result without token or user data to the browser; Proxy refreshes the session and forwards updated cookies. Tokens never enter client-side query data. After login, useLogin clears the old account cache and invalidates authKeys.me; useAuth loads and caches the current user through getCurrentUserAction (auth/me).

shared/lib/session.ts exposes three cookie functions: getSessionCookies(cookieStore), setSessionCookies(cookieStore, tokens), and deleteSessionCookies(cookieStore). Pass await cookies() in an Action or response.cookies when writing in Proxy. apiFetch reads access only; refresh remains in Proxy. Refresh/logout requests still send the backend refresh cookie; token generation, rotation and expiry are unchanged. Deploy backend and web together for this response-contract change.

### Terms and privacy drafts (2026-10-24)

Passenger phase E adds /ar/terms, /en/terms, /ar/privacy and /en/privacy. These server-rendered pages share PolicyPage, localized metadata, a dated draft notice and responsive section navigation. Footer and registration links use the existing locale-aware navigation. Registration behavior and payloads are unchanged; no consent checkbox or backend field was added.

The drafts describe the current test-only service, temporary seat holds, verified payment confirmation, passenger cancellation unavailability, company-cancellation full refunds, and the actual account/booking/payment/session data flows. They do not promise a fixed refund or retention period or that a payment provider stores no card information. The operator identity, approved contact channel, hosting/email providers and processing locations, retention schedule, data-request process and refund timing still require review before public launch. Both pages use noindex, follow until the final content is approved.

Web TypeScript, ESLint, production build, modified-file formatting and diff checks passed. Twenty-nine Chromium checks covered both languages and policies at five viewport widths, keyboard section navigation, language switching, registration/footer links, metadata, stale-cookie public access and browser errors. A temporary isolated frontend preview used dummy environment values and no real .env files; it was stopped and its marked build copy removed after verification. No backend/database/provider/email operation, persistent test dependency, deployment, commit or push was added. Phase E implementation is complete; broader passenger UX review remains next.
