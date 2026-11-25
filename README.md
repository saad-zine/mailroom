<p align="center">
  <img src="assets/mailroom-banner.svg" alt="mailroom" width="519" />
</p>

<p align="center">
  <img src="assets/mailroom-logo-transparent.png" alt="Mailroom" width="120" />
</p>

<h1 align="center">Mailroom</h1>

<p align="center"><strong>The inbox that answers itself — with a human in the loop.</strong></p>

![Mailroom — intro](assets/mailroom-intro.gif)

**Mailroom is an AI email copilot for customer support teams.** It watches a Gmail inbox, categorizes every incoming email, answers product questions with RAG over the team's own documents, drafts replies, has a proofreader agent check each draft — and puts every draft in a human approval queue. Nothing is ever sent without a human saying yes.

## What it does

- **Inbox monitoring** — Mailroom polls the inbox for unanswered threads and processes each one through the agent workflow.
- **Categorization** — every email is classified as a product enquiry, a customer complaint, customer feedback, or unrelated. Unrelated mail is skipped, never answered.
- **RAG answers** — for product questions, the agent designs retrieval queries, pulls answers from the team's knowledge base (their own documents), and grounds the draft in what the docs actually say.
- **Drafting + proofreading** — a writer agent drafts the reply; a proofreader agent checks tone, clarity, and factual grounding, and sends the draft back for a rewrite (up to 3 trials) if it isn't good enough.
- **The approval gate** — every draft lands in a queue where a human approves, edits, or rejects it. Approving in live mode creates the Gmail draft; rejecting blocks that draft forever — a rejected draft can never be sent. This is the whole point: the AI does the work, the human stays in charge.
- **Knowledge base** — upload the team's documents (`.txt`, `.md`), re-index, and the RAG answers update. The seed knowledge base is a realistic agency doc set.
- **Dashboard** — volume by category, drafts pending, approval rate, and response time, plus the full email history.

## How it works

One LangGraph workflow, nine nodes:

```
load inbox → check empty → categorize → ┬ product enquiry → RAG queries → retrieve → writer
                                        └ complaint / feedback → writer
writer → proofreader → sendable? → queue for human approval (or rewrite, max 3 trials)
```

- **State** is a typed `GraphState` (emails, current email, category, draft, RAG queries, retrieved docs, writer messages, sendable flag, trials).
- **Durability** — the graph is compiled with a `SqliteSaver` checkpointer, one thread per run, so a run's state survives a restart and can be inspected afterwards.
- **The graph never sends anything.** Its "send" node only marks a draft ready; the draft is persisted to the approval queue, and a Gmail draft is created only when a human approves it (live mode).
- **Live by default, demo only on request.** Mailroom runs the real workflow out of the box: Groq LLM agents, real Gmail, real RAG (Chroma vector store with Gemini embeddings, or the keyword retriever over your real knowledge base when no Google key is set). It needs a `GROQ_API_KEY` — without one the app starts but refuses to run, and tells you exactly what to set. Nothing is faked. Set `MAILROOM_MODE=mock` only if you explicitly want the demo: a seeded fake inbox (7 realistic support emails across all 4 categories), a rule-based categorizer, and template drafts. All demo data is labelled as such in the API and the UI.

## Run it locally

```bash
# Backend (Python 3.12)
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then set GROQ_API_KEY — free at console.groq.com
uvicorn app.main:app --port 8000
# API docs: http://localhost:8000/docs

# Frontend (Node 20+)
cd ../frontend
npm install
npm run dev            # http://localhost:5173
```

Try it: set `GROQ_API_KEY` in `backend/.env`, open the dashboard, click **Run now** in Settings — with Gmail connected it processes your real inbox; without Gmail it processes whatever mail is in the local inbox (empty until you connect Gmail or add mail). Then open the **Approval queue** — approve one draft, reject another with a reason, and see the decided states stick. Upload a `.txt` file in the **Knowledge base** and re-index.

To connect a real Gmail inbox, supply a `credentials.json` for a Google Cloud project with the Gmail API enabled (see `backend/.env.example`); Mailroom only ever reads mail and creates drafts — it never sends without approval. Set `GOOGLE_API_KEY` as well for Gemini embeddings (vector RAG); without it, RAG uses the keyword retriever over your real knowledge base.

Want the demo instead? Set `MAILROOM_MODE=mock` in `backend/.env` — that seeds the fake inbox and runs the rule-based demo. It is opt-in only, never the default.

## Deploy on Vercel (free)

Everything is configured for Vercel — static frontend, Python serverless API, a Supabase Postgres database, and a daily cron that polls the inbox. The deploy itself is a 2-minute import; it cannot be done from this repo alone because it needs a Vercel account (and a free Supabase project).

How it works on serverless, honestly: a Vercel function has no persistent process, so runs do **not** use a background thread (one would be frozen mid-run when the response returns). Instead each run executes **synchronously inside the invocation** — the cron (or your Run now click) waits for the workflow to finish — and the database lives on Supabase, not on the ephemeral filesystem. With Fluid compute a Hobby function gets up to 300 seconds, and a run processes at most 10 emails per invocation, so a daily sweep fits comfortably.

1. Create a free project at [supabase.com](https://supabase.com) and copy its **connection string** (Project Settings → Database → Connection string, URI format).
2. Push this repo to GitHub, then in the [Vercel dashboard](https://vercel.com/new): **Add New → Project → Import** the repo.
3. Leave the **Root Directory** at the repo root. Vercel reads `vercel.json`: it builds the frontend (`frontend/dist`) and serves the API from `api/index.py`.
4. Set these environment variables in the project settings:
   - `GROQ_API_KEY` (**required** — the live workflow needs it; without it the app refuses to run and tells you so)
   - `DATABASE_URL` (**required on Vercel** — your Supabase connection string; without it the database resets on every cold start)
   - `GOOGLE_API_KEY` (optional — Gemini embeddings for vector RAG; without it, keyword retrieval over your real KB is used)
   - `MAILROOM_MODE=live` (default; set `mock` only for the explicit demo)
   - `GMAIL_CREDENTIALS_JSON` and `GMAIL_TOKEN_JSON` (for real Gmail sync — see below)
5. Deploy. The cron in `vercel.json` polls the inbox once a day at 09:00 UTC. **Run now** in the UI runs a synchronous sweep on demand.

**Gmail on Vercel.** There is no filesystem to upload `credentials.json` / `token.json` to, so pass their *contents* as env vars (base64 or raw JSON). Run Mailroom locally once with your Gmail connected, then:
```bash
base64 -w0 backend/credentials.json   # → GMAIL_CREDENTIALS_JSON
base64 -w0 backend/token.json         # → GMAIL_TOKEN_JSON
```
The token is a testing-mode OAuth token: it expires after 7 days, so re-authorize locally and refresh `GMAIL_TOKEN_JSON` weekly.

Free-tier notes: the Hobby plan allows one cron job, once per day, firing anywhere within the scheduled hour, with no retry on failure — more frequent polling needs Pro (or a free external cron pinging `/api/cron/poll`). Runs are synchronous inside a 300-second function limit, processing at most 10 emails per run.

## Environment variables

See `backend/.env.example` for the full list. The important ones:

| Variable | Purpose | Required |
|---|---|---|
| `GROQ_API_KEY` | Groq (gpt-oss-20b) for the live workflow | **Yes** — without it the app refuses to run |
| `DATABASE_URL` | Postgres connection string (Supabase) — the app uses SQLite locally when unset | **Yes on Vercel** — without it the database resets on cold start |
| `GOOGLE_API_KEY` | Gemini embeddings for RAG | No — keyword retrieval over the real KB is used |
| `MAILROOM_MODE` | `live` (default) or `mock` (explicit demo only) | No |
| `MAILROOM_DB_PATH` | SQLite file location (local dev only) | No (default `backend/mailroom.db`) |
| `GMAIL_CREDENTIALS_PATH` | Path to a Google OAuth `credentials.json` (local) | No — Gmail stays disconnected without it |
| `GMAIL_CREDENTIALS_JSON` / `GMAIL_TOKEN_JSON` | Gmail OAuth file contents, base64 or raw JSON (Vercel) | No — Gmail stays disconnected without them |

Never commit a `.env`, a `credentials.json`, or a `token.json`. They are gitignored.

## API

Full contract in the OpenAPI docs at `/docs` when the backend runs. Highlights:

| Endpoint | What it does |
|---|---|
| `GET /health` | Status, mode (mock/live), provider, Gmail connection |
| `GET /api/emails` | Inbox, filterable by category and status |
| `POST /api/runs` | Start a poll/process run (runs synchronously inside the request, max 10 emails) |
| `GET /api/runs/{id}` | Run status + per-node steps |
| `GET /api/drafts` | The approval queue (`?status=pending`) |
| `POST /api/drafts/{id}/approve` | Approve (creates the Gmail draft in live mode); second decision → 409 |
| `POST /api/drafts/{id}/reject` | Reject with a reason; a rejected draft can never be approved |
| `GET/POST /api/kb` | Knowledge-base docs + upload (`.txt`, `.md`) |
| `POST /api/kb/reindex` | Rebuild the index from all docs |
| `GET /api/stats` | Volume by category, pending drafts, approval rate |
| `GET /api/cron/poll` | Cron entry point (same as starting a run) |

## Tests

```bash
cd backend && .venv/bin/python -m pytest tests/ -q
# 12 passed: categorize routing (all 4 categories), mock run end to end,
# approve + second-approve 409, reject blocks approve 409, KB upload +
# retrieval, draft edit, health 200, stats shape — plus live-mode honesty:
# no-key health reports the missing GROQ_API_KEY, runs are refused with
# 503, live mode never seeds fake mail, and a node with no LLM chain
# raises a clear setup error instead of faking a draft
```

## Honest limitations

<p align="center">
  <img src="assets/bloub-nuage-blase-rouge-anime.svg" alt="Bloub, unimpressed" width="120" />
</p>

- **Gmail OAuth is the real-world wall.** The Gmail API scope Mailroom needs (`gmail.modify`) is a sensitive OAuth scope. In Google's testing mode it works for up to 100 test users with weekly re-authorization — fine for a demo and for your own inbox. A true multi-user product for strangers needs Google's OAuth verification, which is a slow review process. Mailroom does not hide this.
- **Live mode is verified end to end (2026-11-25).** With a real Groq key, the full workflow ran over a sample support email: categorize (product_enquiry), RAG over the real KB, writer draft, proofreader feedback, draft queued for approval. The model is `openai/gpt-oss-20b` — the base's `llama-3.3-70b-versatile` was decommissioned by Groq (404 model_not_found) and was switched after verifying gpt-oss-20b returns clean structured JSON for the categorize and writer agents. Without a Google key, RAG uses the keyword retriever over the real KB instead of the Chroma vector store.
- **No auth, no multi-tenancy.** Anyone who can reach the backend can read the inbox and approve drafts. Do not expose it publicly without adding authentication.
- **Postgres on Supabase, SQLite locally.** Local runs persist in `backend/mailroom.db`; on Vercel the database is Supabase Postgres (`DATABASE_URL`) — it survives cold starts. The storage layer is isolated in `backend/app/db.py`, which translates the app's SQLite-style SQL to Postgres transparently; if `DATABASE_URL` is unset the app falls back to SQLite.
- **Vercel Hobby limits.** One cron per day (fires anywhere within the scheduled hour, no retry on failure), 300-second function limit, runs are synchronous — the inbox poll is a cron-triggered job, not a daemon, and each run processes at most 10 emails.
- **The demo data is synthetic.** The seeded inbox (demo mode only) and the starter knowledge base are fictional (an agency called Agentia). The categorizer and drafts in demo mode are rule-based, not LLM output.

## License

MIT — see [LICENSE](LICENSE).
