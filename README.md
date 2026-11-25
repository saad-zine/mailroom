<p align="center">
  <img src="assets/automail-logo-transparent.png" alt="Automail" width="120" />
</p>

<h1 align="center">Automail</h1>

<p align="center"><strong>The inbox that answers itself — with a human in the loop.</strong></p>

![Automail — intro](assets/automail-intro.gif)

**Automail is an AI email copilot for customer support teams.** It watches a Gmail inbox, categorizes every incoming email, answers product questions with RAG over the team's own documents, drafts replies, has a proofreader agent check each draft — and puts every draft in a human approval queue. Nothing is ever sent without a human saying yes.

## What it does

- **Inbox monitoring** — Automail polls the inbox for unanswered threads and processes each one through the agent workflow.
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
- **Mock mode** — with no API keys and no Gmail credentials, Automail runs end to end on a seeded demo inbox (7 realistic support emails across all 4 categories) with a rule-based categorizer, template drafts, and keyword RAG. All mock data is labelled as such in the API and the UI. This is how the hosted demo works for visitors.

## Run it locally

```bash
# Backend (Python 3.12)
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # optional — runs fully in mock mode with no keys
uvicorn app.main:app --port 8000
# API docs: http://localhost:8000/docs

# Frontend (Node 20+)
cd ../frontend
npm install
npm run dev            # http://localhost:5173
```

Try it: open the dashboard, click **Run now** in Settings, watch the run process the demo inbox, then open the **Approval queue** — approve one draft, reject another with a reason, and see the decided states stick. Upload a `.txt` file in the **Knowledge base** and re-index.

To use the real workflow, set `GROQ_API_KEY` in `backend/.env` (Groq free tier, Llama 3.3 70B) and `GOOGLE_API_KEY` for Gemini embeddings. To connect a real Gmail inbox, supply a `credentials.json` for a Google Cloud project with the Gmail API enabled (see `backend/.env.example`); Automail only ever reads mail and creates drafts — it never sends without approval.

## Deploy on Vercel (free)

Everything is configured for Vercel — static frontend, Python serverless API, and a daily cron that polls the inbox. The deploy itself is a 2-minute import; it cannot be done from this repo alone because it needs a Vercel account.

1. Push this repo to GitHub, then in the [Vercel dashboard](https://vercel.com/new): **Add New → Project → Import** the repo.
2. Leave the **Root Directory** at the repo root. Vercel reads `vercel.json`: it builds the frontend (`frontend/dist`) and serves the API from `api/index.py`.
3. Set these environment variables in the project settings:
   - `AUTOMAIL_DB_PATH=/tmp/automail.db` (required — the serverless filesystem is ephemeral; the store re-seeds on cold start)
   - `GROQ_API_KEY` (optional — without it, the demo runs in mock mode)
   - `GOOGLE_API_KEY` (optional — Gemini embeddings for RAG; without it, keyword retrieval is used)
   - `AUTOMAIL_MODE=auto` (default; `mock` forces the demo, `live` requires `GROQ_API_KEY`)
4. Deploy. The cron in `vercel.json` polls the inbox once a day at 09:00 UTC.

Free-tier notes: the Hobby plan allows one cron job, once per day — more frequent polling needs Pro. Serverless functions on Hobby time out after 10 seconds; a mock-mode poll is fast, a full live Gmail poll may exceed it (use **Run now** in the UI for on-demand runs instead). The demo database is ephemeral on Vercel: drafts and decisions reset when the function cold-starts. For persistent hosted storage, point the app at a hosted Postgres (Supabase free tier) — the storage layer is isolated in `backend/app/db.py` so the swap is contained, but Postgres support is not implemented in v1.

## Environment variables

See `backend/.env.example` for the full list. The important ones:

| Variable | Purpose | Required |
|---|---|---|
| `GROQ_API_KEY` | Groq (Llama 3.3 70B) for the live workflow | No — mock mode without it |
| `GOOGLE_API_KEY` | Gemini embeddings for RAG | No — keyword retrieval fallback |
| `AUTOMAIL_MODE` | `auto` (default), `mock`, or `live` | No |
| `AUTOMAIL_DB_PATH` | SQLite file location | No (default `backend/automail.db`; `/tmp/automail.db` on Vercel) |
| `GMAIL_CREDENTIALS_PATH` | Path to a Google OAuth `credentials.json` | No — Gmail stays disconnected without it |
| `DATABASE_URL` | Reserved for a future Postgres (Supabase) setup | No — SQLite is used in v1 |

Never commit a `.env`, a `credentials.json`, or a `token.json`. They are gitignored.

## API

Full contract in the OpenAPI docs at `/docs` when the backend runs. Highlights:

| Endpoint | What it does |
|---|---|
| `GET /health` | Status, mode (mock/live), provider, Gmail connection |
| `GET /api/emails` | Inbox, filterable by category and status |
| `POST /api/runs` | Start a poll/process run (background thread) |
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
# 8 passed: categorize routing (all 4 categories), mock run end to end,
# approve + second-approve 409, reject blocks approve 409, KB upload +
# retrieval, draft edit, health 200, stats shape
```

## Honest limitations

- **Gmail OAuth is the real-world wall.** The Gmail API scope Automail needs (`gmail.modify`) is a sensitive OAuth scope. In Google's testing mode it works for up to 100 test users with weekly re-authorization — fine for a demo and for your own inbox. A true multi-user product for strangers needs Google's OAuth verification, which is a slow review process. Automail does not hide this.
- **Live mode is untested without keys.** The Groq/Gemini/Chroma paths exist and are wired, but no API keys were available in the build environment, so the live LLM workflow has never executed end to end here. Mock mode is fully verified; live mode needs a key and one real run to confirm.
- **No auth, no multi-tenancy.** Anyone who can reach the backend can read the inbox and approve drafts. Do not expose it publicly without adding authentication.
- **SQLite, single node, ephemeral on serverless.** Local runs persist in `backend/automail.db`; on Vercel the store lives in `/tmp` and resets on cold start. Postgres (Supabase) is the documented next step, not implemented in v1.
- **Vercel Hobby limits.** One cron per day, 10-second function timeout, no long-running polling loop — the inbox poll is a cron-triggered job, not a daemon.
- **The demo data is synthetic.** The seeded inbox and knowledge base are fictional (an agency called Agentia). The categorizer and drafts in mock mode are rule-based, not LLM output.

## License

MIT — see [LICENSE](LICENSE).
