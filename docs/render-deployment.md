# Deploy the API on Render Free

Keep the passenger app and dashboard on Vercel and PostgreSQL on Supabase.
Only the Express API moves to Render. Use a native Node Web Service; no Docker
Hub upload, new package scripts, or separate background worker service is needed.

## Render Web Service

Connect `Eng1Mahmoud/bus-booking-platform`, branch `main`, using these settings:

| Setting           | Value                                        |
| ----------------- | -------------------------------------------- |
| Runtime           | Node                                         |
| Root directory    | Leave empty (npm workspace root)             |
| Build command     | `npm ci --include=dev && npm run build`      |
| Start command     | `npm start`                                  |
| Instance type     | Free                                         |
| Health check path | `/api/v1/ready`                              |
| Region            | Frankfurt (near the Supabase Ireland region) |

Environment:

- `NODE_VERSION=24.18.0`
- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `TRUST_PROXY_HOPS=1` (Render is the public reverse proxy; verify the rate limiter
  sees individual clients after deployment)
- `CORS_ORIGINS=https://bus-booking-platform-nine.vercel.app,https://rihla-dashboard-zeta.vercel.app`
- Copy the existing production database, authentication, Mailjet, and payment
  environment settings from the API deployment. Keep encryption/signing secrets
  unchanged so existing data and sessions remain usable. Keep disabled payment
  capabilities disabled. Do not use a stale local `production.env` wholesale.
- Add the private `CRON_SECRET` when configuring email Cron.

Render supplies `PORT`; the server already reads it. Do not run migrations,
seeds, or workers as part of the build/start command. The Supabase database and
its data already exist.

## Switch traffic after verification

1. Push the reviewed local changes to `main` (the owner handles Git commits/pushes).
2. Deploy and verify `/api/v1/health`, `/api/v1/ready`, `/api/v1/cities` and
   `/api/v1/stations` on the assigned Render URL.
3. Set `API_BASE_URL=https://YOUR-API.onrender.com/api/v1` in both Vercel frontend
   projects, then redeploy both. Keep their public URLs unchanged.
4. If payment webhooks/return settings reference the old API domain, update the
   API-specific callbacks in the provider/settings before enabling payments.
5. Configure [email Cron](email-cron.md) with the Render URL and verify a fresh
   verification email. Review historic pending messages before enabling it.
6. Keep the previous API deployment available until the new frontend and email
   path work. Roll back by restoring the old frontend API_BASE_URL and redeploying.

Free services can restart and spin down after 15 minutes without inbound traffic;
startup can take about a minute. The workspace shares 750 free instance-hours per
month across its free services. Existing services consume that same allowance.
Longer requests are possible, but finite batches, row locks and retries remain
necessary. Request timeouts do not cancel in-flight work; use logs/outbox state
to assess delivery. This setup does not guarantee sending an unlimited backlog
in one call. Supabase is the scheduler, and Render performs the mail delivery.
