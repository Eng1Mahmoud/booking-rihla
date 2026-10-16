# Bus Booking Platform

A bus booking application for Egypt, built in focused feature batches with explanations.

## Current feature: City API

Implemented: an Express + TypeScript API with a health endpoint, centralized JSON error responses, validated startup settings, Helmet security headers, JSON body parsing with a 100kb limit, and an explicit CORS allowlist. The health endpoint checks that the API responds. Local PostgreSQL setup is now defined in compose.yaml; Prisma 8 backs the complete City CRUD endpoints; the health endpoint remains independent of the database.

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

## Next small step

ESLint and Prettier are configured. Request IDs and structured logging remain deferred. Helmet security headers are implemented. JSON parsing and the body limit are implemented. CORS is implemented. Local PostgreSQL is running and verified. Prisma 8 is configured; City has a UUID string id and its table is initialized; cities can be created, listed, retrieved, updated, and deleted over HTTP; the standalone example is also available.

## Git workflow

Group related implementation, validation, tests, migrations, and usage notes into one feature commit. Finish the feature, verify it, explain the result, commit, and push under the owner's standing instruction before starting the next. Finish the backend before the passenger website, then build the dashboard. Never commit `.env`, dependencies, or build output. The safe `.env.example` is committed so other developers know which settings exist. Git author identity is configured locally for this repository.

Push changes to GitHub only after the owner reviews them and explicitly approves the push.

## Linting

Run npm run lint from the repository root. ESLint checks API source and TypeScript tests using recommended JavaScript and TypeScript rules. Intentionally unused function parameters may start with an underscore. The command reports problems without changing files, and fails on any errors or warnings. Generated output, dependencies, and coverage are excluded. The tool configuration is eslint.config.mjs; application code remains TypeScript.

## Formatting

Run npm run format to apply Prettier formatting, or npm run format:check to verify it without editing files. Configuration is in .prettierrc.json; exclusions are in .prettierignore. Generated output, dependencies, local environment files, and the npm lockfile are excluded. ESLint and Prettier run separately; eslint-config-prettier disables conflicting lint rules.

## Security headers

Helmet runs before the routes, so its headers apply to successful responses and 404 errors. The existing x-powered-by setting remains disabled. Default Helmet headers include X-Content-Type-Options: nosniff, Referrer-Policy: no-referrer, Content-Security-Policy, and Strict-Transport-Security. Helmet does not configure HTTPS, authentication, request body limits, or CORS. The current API uses the documented default configuration.

## JSON request bodies

The API parses application/json bodies before routes, with an explicit 100kb (102400-byte) limit. This makes parsed data available as request.body; it does not validate business fields. The default parser accepts JSON objects and arrays.

Malformed JSON returns HTTP 400 with INVALID_JSON. Bodies exceeding the limit return HTTP 413 with PAYLOAD_TOO_LARGE. Responses use the existing JSON error format and do not echo the submitted content.

This limit applies to the JSON parser, not every possible request content type or file upload. There are no POST business endpoints yet: a valid POST to an unknown route still returns the normal 404, while malformed or oversized JSON is rejected before routing.

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
- apps/api/src/prisma/db.ts loads the API .env, validates settings through parseEnv, and requires DATABASE_URL when the database module is imported. The city service loads this module only for city requests. Health requests and the default automated suite remain independent of PostgreSQL.
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

City follows a simple layered structure: routes/cityRoutes.ts maps endpoints, controllers/cityController.ts validates HTTP inputs and sends responses, services/cityService.ts returns plain data using Prisma, and schemas/citySchema.ts defines validation. There is no separate repository layer. createApp accepts a city service for isolated HTTP tests. Express 5 forwards rejected route promises to the centralized error handler.

```sh
npm test
npm run test:db
```

The default suite uses an in-memory city service and needs no database. test:db is an opt-in real PostgreSQL test: it creates a uniquely named temporary city through HTTP, checks persistence/list/detail, and deletes only its own row afterward. Run it against a development database after applying migrations.

Verification also recreated City from the baseline in a new temporary database, reran migrations, exercised real HTTP operations there, and removed that temporary database. No existing development data was removed.

## Backend structure

Use familiar layer-based folders and camelCase file names. app.ts configures Express; server.ts starts listening. routes map URLs to controllers. controllers handle request/response and validation using schemas. services accept ordinary data, apply business rules when needed, and use Prisma directly. middlewares contains the shared error handler; errors contains AppError. config holds validated environment settings, prisma holds the contract and client, and scripts holds standalone learning/development commands.

Keep the flow Route -> Controller -> Service -> Prisma. Do not add repository, base-class, or dependency-container layers unless a concrete requirement warrants them. Express Request/Response objects stay out of services. Prisma-generated contract and migration artifacts keep their tool-defined names.

City updates use PATCH with at least one of nameAr/nameEn. The same trimmed 1-100 character rules apply; empty updates, unknown fields, and id changes are rejected. Omitted names stay unchanged. PATCH/DELETE validate UUIDs and return CITY_NOT_FOUND when the record is absent. The real PostgreSQL test exercises create/list/detail/update/delete and cleans up its uniquely named row.

Work order: complete, test, document, commit, and push each backend feature before beginning the next. After all agreed backend features are complete, implement the passenger website, then the administration dashboard. Production publication and real-money operations still need explicit approval.
