# Scheduled email delivery

The local `email:worker` polls every two seconds. Render Free should not be relied on to keep that process running continuously.
Instead, Supabase Cron calls `POST /api/v1/internal/jobs/email` once per minute.
The API processes one existing batch of up to 20 eligible messages per queue
(80 total), with account messages first, followed by booking notices, tickets
and reminders. It awaits the batch before responding, without the former Vercel
execution deadline. Larger backlogs continue on the next scheduled invocation.
Existing row locks, eligibility checks and retry
backoff are reused. This is at-least-once delivery: a crash after Mailjet accepts
an email but before the database commit can cause a duplicate.

## Setup

1. Generate an independent random 32-byte token. Set it as `CRON_SECRET` in the
   API service's environment on Render. Keep the existing
   `AUTH_CODE_SECRET` stable and ensure `MJ_APIKEY`, `MJ_SECRETKEY`, and
   `EMAIL_FROM` are configured with the verified Mailjet sender.
2. Deploy the API on Render using [the deployment guide](render-deployment.md).
   Set `CRON_SECRET` on Render, not in the frontend projects.
3. Before enabling delivery, review pending EmailOutbox, BookingNotice and Ticket
   delivery/reminder records imported from local data. Expired account codes and
   past tickets are discarded by existing services; other eligible historical
   notices can still be sent. Do not blindly delete or mark them sent.
4. Enable Supabase Cron (`pg_cron`) and `pg_net`. In Supabase Vault, create a
   secret named `email_cron_secret` containing the same `CRON_SECRET`.
5. Run the following SQL once in the correct Rihla project. Do not commit the
   secret value. Keep only one job named `rihla-email`.

```sql
select cron.schedule(
  'rihla-email',
  '* * * * *',
  $job$
  select net.http_post(
    url := 'https://YOUR-API.onrender.com/api/v1/internal/jobs/email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'email_cron_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 600000
  );
  $job$
);
```

## Verify and operate

Request a fresh verification code, then check Mailjet and the account outbox
within the next minute. Check Render's `email_job_completed` counters and
`email_job_queue_failed` events. Responses contain no email addresses or codes.
HTTP 401 means invalid authorization; HTTP 503 means missing configuration or a
processing failure. Successful processing returns counters; discarded codes need
a new verification request. Failed deliveries retain the existing backoff and
five-attempt limit.

Cron history confirms the SQL ran, not that HTTP delivery succeeded. Inspect
`net._http_response` status/error fields as well as Render logs and Mailjet.
The next scheduled invocation retries due work; there is no long-running loop.
Disable `rihla-email` in Supabase Cron to stop scheduled delivery. Do not run the
local worker against production at the same time. Overlapping scheduled requests reuse the existing database row locks and recheck
delivery state after acquiring the lock. Normal overlap does not resend committed
messages; crash recovery still has at-least-once semantics. Monitor duration and
queue backlog: 80 is a per-request cap, not a guaranteed per-minute throughput.
