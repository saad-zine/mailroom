# Mailroom — production setup (Vercel + Supabase + Gmail Push)

This is the configuration for the hosted, multi-user product. Local development
and the demo (`MAILROOM_MODE=mock`) still work with none of these variables set.

## 1. Supabase

1. Create a project. Enable **Email** auth (or whichever provider you want) in
   Authentication → Providers. Get the project URL and anon key.
2. Run the schema migration once (the app also adds columns idempotently at
   startup): `python -c "from app.db import init_db; init_db()"` from `backend/`
   with `DATABASE_URL` set.
3. Set:

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | Vercel + backend | Supabase Postgres connection string. Required on Vercel. |
| `SUPABASE_URL` | Vercel | Used to verify access tokens via JWKS. |
| `SUPABASE_ANON_KEY` | Vercel | Frontend Supabase client. |
| `SUPABASE_JWT_SECRET` | Vercel (legacy only) | Only if your project uses HS256 JWTs. New projects use JWKS. |
| `VITE_SUPABASE_URL` | Vercel | Frontend auth. |
| `VITE_SUPABASE_ANON_KEY` | Vercel | Frontend auth. |

The authenticated user's Supabase `sub` is the workspace id. Every row in
`emails`, `drafts`, `decisions`, `kb_*`, `runs`, and `run_steps` is scoped to it
in every API query. On startup against Postgres with `SUPABASE_URL` set, the app
also enables Row Level Security and creates a `tenant_isolation` policy on all
tenant tables using `auth.uid()::text = workspace_id`. Keep RLS enabled in the
Supabase dashboard — direct anon access must never bypass the app's scoping.

## 2. Google Cloud / Gmail

1. Create a Google Cloud project, enable the **Gmail API** and **Pub/Sub API**.
2. OAuth consent screen: add scopes `gmail.readonly`, `gmail.modify`, `openid`,
   `email`. `gmail.modify` is a restricted scope — public use requires Google
   verification. Testing mode limits you to 100 test users and 7-day tokens.
3. Create an **OAuth client ID → Web application**. Authorised redirect URI:
   `https://<your-domain>/api/gmail/callback`.
4. Create a Pub/Sub topic, e.g. `projects/my-project/topics/mailroom-gmail`.
   Grant `gmail-api-push@system.gserviceaccount.com` the role
   **Pub/Sub Publisher** on that topic.
5. Create a push subscription pointing to
   `https://<your-domain>/api/gmail/webhook`, with an OIDC service account
   whose email you put in `GMAIL_PUBSUB_AUDIENCE`.

Set:

| Variable | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GMAIL_REDIRECT_URI` | `https://<your-domain>/api/gmail/callback` |
| `APP_URL` | `https://<your-domain>` |
| `GMAIL_PUBSUB_TOPIC` | Full topic name from step 4 |
| `GMAIL_PUBSUB_AUDIENCE` | Push subscription service-account email |
| `MAILROOM_TOKEN_KEY` | `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `CRON_SECRET` | A long random string (Vercel sends it as a Bearer token) |
| `GROQ_API_KEY` | Required for live drafting |

Gmail push notifications contain only `emailAddress` + `historyId`. The webhook
verifies Google's JWT, fetches the full message bodies with `users.messages.get`,
deduplicates by Gmail message id, and queues processing jobs.

## 3. Vercel crons

`vercel.json` schedules two jobs on Hobby (once per day each):

- `/api/cron/poll` — drains queued jobs and processes pending mail.
- `/api/cron/renew-watches` — renews Gmail watches (they expire in ~7 days).

Both require `Authorization: Bearer $CRON_SECRET`, which Vercel sends
automatically. For near-real-time mail, the Pub/Sub webhook is the primary path;
crons are the safety net.

## 4. Deploy

`npm run build` in `frontend/` and `python -m compileall backend/app` locally
before pushing. Vercel installs root `requirements.txt` and serves
`api/index.py`.
