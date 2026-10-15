# Bus Booking Platform

A bus booking application for Egypt, built in small, explained steps.

## Current step: a running API

Implemented: an Express + TypeScript API with a health endpoint and JSON 404 responses. The health endpoint checks that the API responds; there is no database yet.

See [the implementation roadmap](IMPLEMENTATION_PLAN.md) for all planned phases and [the original requirements](docs/PRODUCT_REQUIREMENTS.md) for the long-term product vision. Requirements describe future work, not features already available.

## Run locally

Prerequisites: Node.js 24 or later and npm. Run commands from the repository root.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:4000/api/v1/health in your browser. Expected response:

```json
{ "status": "ok" }
```

Stop the server with Ctrl+C. Development mode restarts it when source files change.

## Verify and build

```sh
npm run typecheck
npm test
npm run build
npm start
```

Stop the development server before `npm start`; both use port 4000. `npm start` runs the compiled JavaScript produced by `npm run build`. Tests choose an available port automatically. After the lockfile is committed, use `npm ci` for a clean, repeatable dependency installation.

## Understand the code

Read these files in order:

1. `package.json`: root commands delegate to the API workspace. A workspace lets us add the passenger and admin apps later in the same repository.
2. `apps/api/package.json`: API commands and dependencies. Node runs TypeScript directly in development; TypeScript separately checks types and builds JavaScript.
3. `apps/api/src/app.ts`: creates Express and defines HTTP responses. A GET request to `/api/v1/health` returns JSON with status 200. Unknown paths receive JSON with status 404.
4. `apps/api/src/server.ts`: imports the app and listens on local port 4000. Keeping this separate lets tests start the app on their own port.
5. `apps/api/test/health.test.mjs`: starts a real HTTP server and checks the public responses using Node's built-in test runner.
6. `apps/api/tsconfig.json`: strict type checks and compilation from `src` into `dist`.

Request flow: browser → server listening on port 4000 → Express route → JSON response.

Dependencies and type definitions follow the [official Express setup guidance](https://expressjs.com/en/starter/installing/). This setup uses [Node's native TypeScript support](https://nodejs.org/api/typescript.html) for development and tests, with a separate compiler check.

## Next small step

Add validated environment configuration so the port can be configured. Logging, error middleware, linting, and the remaining phase 1 items follow in separate changes before database work.

## Git workflow

Keep each commit focused, verify it, and explain it before the next learning step. Never commit `.env`, dependencies, or build output. Git author identity should be configured locally for this repository using the name and email chosen by its owner.
