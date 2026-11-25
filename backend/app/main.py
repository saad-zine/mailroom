"""Mailroom FastAPI app.

API contract (frozen — a frontend is building against it):
  GET  /health, /api/emails, /api/emails/{id}, /api/runs/{id},
       /api/drafts, /api/drafts/{id}, /api/kb, /api/stats, /api/settings,
       /api/cron/poll
  POST /api/runs, /api/drafts/{id}/approve, /api/drafts/{id}/reject,
       /api/kb/upload, /api/kb/reindex
  PUT  /api/drafts/{id}
  DELETE /api/kb/{id}

Rules enforced here:
- A draft can be approved only while pending. A second approve -> 409.
- A rejected draft can NEVER be approved afterwards (approve -> 409).
- In LIVE mode, approve creates the Gmail draft via GmailTools; in mock
  mode it only marks the draft approved locally (labelled mock) — nothing
  is ever sent without a human approving first.
"""
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from . import kb, mock_engine
from .config import VERSION, settings
from .db import connect, from_json, to_json, utcnow_iso, init_db
from .gmail_client import create_gmail_draft, gmail_connected
from .graph_runner import create_run, run_workflow
from .models import DraftApprove, DraftEdit, DraftReject
from .seed import seed_all


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_all()
    yield


app = FastAPI(title="Mailroom — AI email copilot for customer support",
              version=VERSION, lifespan=lifespan)
# Belt and braces: the tables must exist even if a caller never runs the
# lifespan (e.g. TestClient used without a context manager).
init_db()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------- helpers
def _email_row(row: dict) -> dict:
    with connect() as conn:
        has_draft = conn.execute(
            "SELECT 1 FROM drafts WHERE email_id = ?", (row["id"],)
        ).fetchone() is not None
    return {
        "id": row["id"],
        "thread_id": row.get("thread_id"),
        "sender": row.get("sender"),
        "subject": row.get("subject"),
        "snippet": row.get("snippet"),
        "body": row.get("body"),
        "category": row.get("category"),
        "status": row.get("status"),
        "received_at": row.get("received_at"),
        "has_draft": has_draft,
    }


def _draft_row(row: dict) -> dict:
    return {
        "id": row["id"],
        "email_id": row.get("email_id"),
        "sender": row.get("sender"),
        "subject": row.get("subject"),
        "category": row.get("category"),
        "body": row.get("body"),
        "proofreader_feedback": row.get("proofreader_feedback"),
        "status": row.get("status"),
        "created_at": row.get("created_at"),
        "decided_by": row.get("decided_by"),
        "decision_note": row.get("decision_note"),
    }


def _get_draft_or_404(draft_id: int) -> dict:
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM drafts WHERE id = ?", (draft_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="draft not found")
    return dict(row)


def _start_run() -> dict:
    # Live mode without an LLM key: refuse with a clear setup message
    # instead of starting a run that cannot do real work.
    if settings.mode == "live" and not settings.llm_available:
        raise HTTPException(
            status_code=503,
            detail=settings.setup_hint or "GROQ_API_KEY is not set.")
    run = create_run()
    # Synchronous: the workflow runs inside this request and finishes
    # before we return. A detached thread is unreliable on serverless —
    # the platform may freeze the instance once the response is sent,
    # so the run would die halfway. The frontend polls
    # GET /api/runs/{id} and sees the final status right away.
    run_workflow(run["id"])
    with connect() as conn:
        row = conn.execute(
            "SELECT status FROM runs WHERE id = ?", (run["id"],)).fetchone()
    return {"run_id": run["id"],
            "status": row["status"] if row else "completed"}


# ---------------------------------------------------------------- health/settings
@app.get("/health")
def health():
    return {
        "status": "ok",
        "mode": settings.mode,
        "provider": settings.provider,
        "model": settings.model,
        "gmail_connected": gmail_connected(),
        "demo": settings.demo_mode,
        "llm_available": settings.llm_available,
        "vector_rag_available": settings.vector_rag_available,
        "missing_keys": settings.missing_keys,
        "setup_hint": settings.setup_hint,
    }


@app.get("/api/settings")
def get_settings():
    return {
        "mode": settings.mode,
        "provider": settings.provider,
        "model": settings.model,
        "gmail_connected": gmail_connected(),
        "demo_mode": settings.demo_mode,
        "llm_available": settings.llm_available,
        "vector_rag_available": settings.vector_rag_available,
        "missing_keys": settings.missing_keys,
        "setup_hint": settings.setup_hint,
        "version": VERSION,
    }


@app.get("/api/stats")
def get_stats():
    with connect() as conn:
        total = conn.execute("SELECT COUNT(*) FROM emails").fetchone()[0]
        by_cat = {c: 0 for c in mock_engine.CATEGORIES}
        for r in conn.execute(
                "SELECT category, COUNT(*) n FROM emails GROUP BY category"):
            if r["category"]:
                by_cat[r["category"]] = r["n"]
        pending = conn.execute(
            "SELECT COUNT(*) FROM drafts WHERE status='pending'").fetchone()[0]
        approved = conn.execute(
            "SELECT COUNT(*) FROM drafts WHERE status='approved'").fetchone()[0]
        rejected = conn.execute(
            "SELECT COUNT(*) FROM drafts WHERE status='rejected'").fetchone()[0]
        pairs = conn.execute(
            """SELECT e.received_at AS received, d.created_at AS created
               FROM drafts d JOIN emails e ON e.id = d.email_id"""
        ).fetchall()
    decided = approved + rejected
    approval_rate = (approved / decided) if decided else 0.0
    deltas = []
    for p in pairs:
        try:
            r = datetime.fromisoformat(p["received"])
            c = datetime.fromisoformat(p["created"])
            deltas.append((c - r).total_seconds() / 60.0)
        except (ValueError, TypeError):
            continue
    avg = (sum(deltas) / len(deltas)) if deltas else None
    return {
        "total_emails": total,
        "by_category": by_cat,
        "pending_drafts": pending,
        "approved": approved,
        "rejected": rejected,
        "approval_rate": round(approval_rate, 3),
        "avg_first_response_min": round(avg, 1) if avg is not None else None,
    }


# ---------------------------------------------------------------- emails
@app.get("/api/emails")
def list_emails(category: str | None = Query(default=None),
                status: str | None = Query(default=None),
                limit: int = Query(default=50, ge=1, le=200)):
    query = "SELECT * FROM emails"
    clauses, params = [], []
    if category:
        clauses.append("category = ?")
        params.append(category)
    if status:
        clauses.append("status = ?")
        params.append(status)
    if clauses:
        query += " WHERE " + " AND ".join(clauses)
    query += " ORDER BY received_at DESC LIMIT ?"
    params.append(limit)
    with connect() as conn:
        rows = conn.execute(query, params).fetchall()
    return {"emails": [_email_row(dict(r)) for r in rows]}


@app.get("/api/emails/{email_id}")
def get_email(email_id: int):
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM emails WHERE id = ?", (email_id,)).fetchone()
        draft_row = conn.execute(
            "SELECT * FROM drafts WHERE email_id = ? ORDER BY id DESC LIMIT 1",
            (email_id,)).fetchone() if row else None
    if row is None:
        raise HTTPException(status_code=404, detail="email not found")
    email = _email_row(dict(row))
    draft = _draft_row(dict(draft_row)) if draft_row else None
    if draft_row:
        rag_context = from_json(draft_row["rag_context_json"], default=[]) or []
    else:
        rag_context = mock_engine.mock_rag(
            f"{email['subject']} {email['body']}") \
            if settings.mode == "mock" else kb.retrieve(
            f"{email['subject']} {email['body']}")
        rag_context = [{"chunk": c["chunk"], "source": settings.mode}
                       for c in rag_context]
    return {"email": email, "draft": draft, "rag_context": rag_context}


# ---------------------------------------------------------------- runs
@app.post("/api/runs")
def start_run():
    return _start_run()


@app.get("/api/cron/poll")
def cron_poll():
    """Vercel Cron entry point — same effect as POST /api/runs."""
    return _start_run()


@app.get("/api/runs/{run_id}")
def get_run(run_id: int):
    with connect() as conn:
        run = conn.execute(
            "SELECT * FROM runs WHERE id = ?", (run_id,)).fetchone()
        steps = conn.execute(
            "SELECT seq, node, detail, status FROM run_steps "
            "WHERE run_id = ? ORDER BY seq", (run_id,)).fetchall() \
            if run else []
    if run is None:
        raise HTTPException(status_code=404, detail="run not found")
    return {
        "run_id": run["id"],
        "status": run["status"],
        "steps": [dict(s) for s in steps],
        "started_at": run["started_at"],
        "ended_at": run["ended_at"],
    }


# ---------------------------------------------------------------- drafts
@app.get("/api/drafts")
def list_drafts(status: str | None = Query(default="pending")):
    query = "SELECT * FROM drafts"
    params: list = []
    if status:
        query += " WHERE status = ?"
        params.append(status)
    query += " ORDER BY created_at DESC"
    with connect() as conn:
        rows = conn.execute(query, params).fetchall()
    return {"drafts": [_draft_row(dict(r)) for r in rows]}


@app.get("/api/drafts/{draft_id}")
def get_draft(draft_id: int):
    return {"draft": _draft_row(_get_draft_or_404(draft_id))}


@app.put("/api/drafts/{draft_id}")
def edit_draft(draft_id: int, payload: DraftEdit):
    draft = _get_draft_or_404(draft_id)
    if draft["status"] != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"cannot edit a {draft['status']} draft")
    with connect() as conn:
        conn.execute("UPDATE drafts SET body = ? WHERE id = ?",
                     (payload.body, draft_id))
    return {"draft": _draft_row(_get_draft_or_404(draft_id))}


def _record_decision(draft_id: int, action: str, note: str | None,
                     decided_by: str | None) -> None:
    with connect() as conn:
        conn.execute(
            "INSERT INTO decisions(draft_id, action, note, decided_by, decided_at)"
            " VALUES (?, ?, ?, ?, ?)",
            (draft_id, action, note or "", decided_by or "human", utcnow_iso()),
        )


@app.post("/api/drafts/{draft_id}/approve")
def approve_draft(draft_id: int, payload: DraftApprove | None = None):
    draft = _get_draft_or_404(draft_id)
    if draft["status"] == "rejected":
        raise HTTPException(
            status_code=409,
            detail="rejected drafts can never be approved or sent")
    if draft["status"] != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"draft already {draft['status']}")
    note = (payload.note if payload else None) or ""
    decided_by = (payload.decided_by if payload else None) or "human"
    gmail_draft_id = None
    if settings.mode == "live" and gmail_connected():
        with connect() as conn:
            email_row = conn.execute(
                "SELECT * FROM emails WHERE id = ?", (draft["email_id"],)
            ).fetchone()
        gmail_draft = create_gmail_draft(
            dict(email_row) if email_row else {}, draft["body"])
        gmail_draft_id = (gmail_draft or {}).get("id")
        note = (note + f" [gmail draft: {gmail_draft_id}]") \
            if gmail_draft_id else (note + " [gmail draft creation failed]")
    elif settings.mode == "live":
        # Live mode, Gmail not connected: the approval is recorded, but
        # no Gmail draft exists yet. Say so plainly — this is not mock.
        note = (note + " [live: Gmail not connected — no Gmail draft created]") \
            if note else "[live: Gmail not connected — no Gmail draft created]"
    else:
        note = (note + " [demo: no Gmail draft created]") if note \
            else "[demo: no Gmail draft created]"
    with connect() as conn:
        conn.execute(
            "UPDATE drafts SET status='approved', decided_by=?, "
            "decision_note=? WHERE id = ?",
            (decided_by, note, draft_id),
        )
    _record_decision(draft_id, "approved", note, decided_by)
    return {"draft": _draft_row(_get_draft_or_404(draft_id))}


@app.post("/api/drafts/{draft_id}/reject")
def reject_draft(draft_id: int, payload: DraftReject | None = None):
    draft = _get_draft_or_404(draft_id)
    if draft["status"] != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"draft already {draft['status']}")
    reason = (payload.reason if payload else None) or (
        payload.note if payload and payload.note else "")
    decided_by = (payload.decided_by if payload else None) or "human"
    with connect() as conn:
        conn.execute(
            "UPDATE drafts SET status='rejected', decided_by=?, "
            "decision_note=? WHERE id = ?",
            (decided_by, reason, draft_id),
        )
    _record_decision(draft_id, "rejected", reason, decided_by)
    return {"draft": _draft_row(_get_draft_or_404(draft_id))}


# ---------------------------------------------------------------- knowledge base
@app.get("/api/kb")
def list_kb():
    return {"docs": kb.list_docs()}


@app.post("/api/kb/upload")
async def upload_kb(file: UploadFile = File(...)):
    name = Path(file.filename or "").name
    if not name.lower().endswith((".txt", ".md")):
        raise HTTPException(
            status_code=400, detail="only .txt and .md files are accepted")
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="file must be UTF-8 text")
    if not text.strip():
        raise HTTPException(status_code=400, detail="file is empty")
    # Persist the file so /api/kb/reindex can rebuild from it later.
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    (settings.uploads_dir / name).write_text(text, encoding="utf-8")
    doc = kb.add_doc(name, text, source=name)
    return {"id": doc["id"], "name": doc["name"], "chunks": doc["chunks"]}


@app.post("/api/kb/reindex")
def reindex_kb():
    docs = kb.reindex()
    return {"docs": docs}


@app.delete("/api/kb/{doc_id}")
def delete_kb_doc(doc_id: int):
    if not kb.delete_doc(doc_id):
        raise HTTPException(status_code=404, detail="kb doc not found")
    return {"deleted": doc_id}
