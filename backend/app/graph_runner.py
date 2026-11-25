"""Run engine: drives the LangGraph workflow over unanswered emails and
persists every result to the DB (run_steps, drafts, email statuses).

One graph invocation per email (single-email injected inbox), each with
its own checkpointer thread_id derived from the run
(`run-{run_id}-email-{email_id}`), checkpoints in backend/checkpoints.db.

Live mode uses the real Groq LLM workflow; mock mode (or any missing
optional piece in live mode) falls back to the rule-based mock engine
inside the same nodes, so a run degrades gracefully and never crashes.
"""
import sqlite3
import traceback
import uuid

from . import kb, mock_engine
from .config import settings
from .db import connect, from_json, to_json, utcnow_iso
from .gmail_client import gmail_connected

INITIAL_STATE = {
    "emails": [],
    "current_email": {
        "id": "", "threadId": "", "messageId": "", "references": "",
        "sender": "", "subject": "", "body": "",
    },
    "email_category": "",
    "generated_email": "",
    "rag_queries": [],
    "retrieved_documents": "",
    "writer_messages": [],
    "sendable": False,
    "trials": 0,
}


def create_run() -> dict:
    thread_id = f"run-{uuid.uuid4().hex[:12]}"
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO runs(thread_id, status, started_at) VALUES (?, 'running', ?)",
            (thread_id, utcnow_iso()),
        )
        return {"id": cur.lastrowid, "thread_id": thread_id}


def _record_step(run_id: int, seq: int, node: str, detail: str, status: str = "done") -> int:
    with connect() as conn:
        conn.execute(
            "INSERT INTO run_steps(run_id, seq, node, detail, status, ts) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (run_id, seq, node, detail[:2000], status, utcnow_iso()),
        )
    return seq + 1


def _finish_run(run_id: int, status: str) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE runs SET status = ?, ended_at = ? WHERE id = ?",
            (status, utcnow_iso(), run_id),
        )


def _get_unanswered_emails() -> list[dict]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM emails WHERE status = 'new' ORDER BY received_at"
        ).fetchall()
    return [dict(r) for r in rows]


def _sync_gmail_inbox() -> int:
    """Live Gmail: pull unanswered threads into the DB. No-op when Gmail
    is not connected. Returns number of new emails inserted."""
    if not gmail_connected():
        return 0
    try:
        from agent.tools.GmailTools import GmailToolsClass
        tools = GmailToolsClass()
        fetched = tools.fetch_unanswered_emails()
    except Exception as exc:
        print(f"[run] gmail sync failed (degraded to local inbox): {exc}")
        return 0
    inserted = 0
    with connect() as conn:
        for e in fetched:
            exists = conn.execute(
                "SELECT id FROM emails WHERE thread_id = ?", (e.get("threadId"),)
            ).fetchone()
            if exists:
                continue
            body = e.get("body", "")
            conn.execute(
                """INSERT INTO emails(thread_id, sender, subject, snippet,
                       body, category, status, received_at, source)
                   VALUES (?, ?, ?, ?, ?, ?, 'new', ?, 'live')""",
                (
                    e.get("threadId"), e.get("sender"), e.get("subject"),
                    " ".join(body.split())[:140], body,
                    mock_engine.categorize(body + " " + e.get("subject", "")),
                    utcnow_iso(),
                ),
            )
            inserted += 1
    return inserted


def _proofreader_feedback(writer_messages: list) -> str:
    """Extract the proofreader's feedback text.

    writer_messages is an add_messages list, so entries come back as
    LangChain message objects — use .content, never str(msg) (its repr
    leaks additional_kwargs/response_metadata into the stored feedback).
    """
    for msg in reversed(writer_messages or []):
        if hasattr(msg, "content"):
            text = msg.content or ""
        elif isinstance(msg, dict):
            text = msg.get("content", "") or ""
        else:
            text = str(msg)
        if "Proofreader Feedback:" in text:
            return text.split("Proofreader Feedback:", 1)[1].strip()
    return ""


def _process_one_email(run_id: int, seq: int, email: dict) -> int:
    """Run the 9-node graph over a single email; persist draft or skip."""
    mode = settings.mode
    email_dict = {
        "id": str(email["id"]),
        "threadId": email.get("thread_id") or "",
        "messageId": "",
        "references": "",
        "sender": email.get("sender") or "",
        "subject": email.get("subject") or "",
        "body": email.get("body") or "",
    }
    seq = _record_step(run_id, seq, "load_inbox_emails",
                       f"Loaded email #{email['id']}: {email.get('subject')}")
    try:
        from langgraph.checkpoint.sqlite import SqliteSaver
        from agent.graph import Workflow

        conn = sqlite3.connect(str(settings.checkpoints_path),
                               check_same_thread=False)
        try:
            checkpointer = SqliteSaver(conn)
            workflow = Workflow(emails=[email_dict], fallback=mock_engine,
                                checkpointer=checkpointer)
            config = {
                "configurable": {
                    "thread_id": f"run-{run_id}-email-{email['id']}"},
                "recursion_limit": 100,
            }
            final_state = dict(INITIAL_STATE)
            for output in workflow.app.stream(dict(INITIAL_STATE), config):
                for node_name, value in output.items():
                    detail = ""
                    if isinstance(value, dict):
                        if node_name == "categorize_email" and "email_category" in value:
                            detail = f"category={value['email_category']}"
                        elif "generated_email" in value:
                            detail = "draft written"
                        elif "sendable" in value:
                            detail = ("proofreader: sendable"
                                     if value.get("sendable")
                                     else "proofreader: rewrite")
                    seq = _record_step(run_id, seq, node_name, detail)
                    final_state.update(value)
            # get_state gives the authoritative final values.
            try:
                state_values = workflow.app.get_state(config).values or {}
                if state_values:
                    final_state.update(state_values)
            except Exception:
                pass
        finally:
            conn.close()
    except Exception:
        traceback.print_exc()
        seq = _record_step(run_id, seq, "error",
                           f"workflow failed for email #{email['id']}, "
                           "falling back to mock engine", status="failed")
        # Last-resort fallback: mock pipeline directly, same outcome shape.
        category = mock_engine.categorize(
            email.get("body", "") + " " + email.get("subject", ""))
        rag = mock_engine.mock_rag(
            email.get("subject", "") + " " + email.get("body", "")) \
            if category == "product_enquiry" else []
        draft = mock_engine.build_draft(
            category, email.get("sender", ""), email.get("subject", ""),
            email.get("body", ""), rag)
        final_state = {
            "email_category": category,
            "generated_email": draft,
            "writer_messages": [mock_engine.proofread(
                email.get("body", ""), draft)["feedback"]],
            "retrieved_documents": "\n".join(c["chunk"] for c in rag),
        }

    category = final_state.get("email_category") or email.get("category") \
        or "product_enquiry"
    draft_body = (final_state.get("generated_email") or "").strip()
    feedback = _proofreader_feedback(final_state.get("writer_messages", []))

    if category == "unrelated" or not draft_body:
        with connect() as conn:
            conn.execute(
                "UPDATE emails SET category = ?, status = 'skipped' WHERE id = ?",
                (category, email["id"]),
            )
        return _record_step(run_id, seq, "skip_unrelated_email",
                            f"Email #{email['id']} skipped ({category})")

    # RAG context for the draft record.
    if mode == "mock":
        rag_context = mock_engine.mock_rag(
            email.get("subject", "") + " " + email.get("body", ""))
        source = "mock"
    else:
        retrieved = (final_state.get("retrieved_documents") or "").strip()
        if retrieved:
            rag_context = [{"chunk": retrieved, "source": "live"}]
        else:
            rag_context = mock_engine.mock_rag(
                email.get("subject", "") + " " + email.get("body", ""))
        source = "live"
    if not feedback:
        feedback = mock_engine.proofread(
            email.get("body", ""), draft_body)["feedback"]

    with connect() as conn:
        conn.execute(
            "UPDATE emails SET category = ?, status = 'drafted' WHERE id = ?",
            (category, email["id"]),
        )
        conn.execute(
            """INSERT INTO drafts(email_id, sender, subject, category, body,
                   proofreader_feedback, rag_context_json, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)""",
            (email["id"], email.get("sender"), email.get("subject"), category,
             draft_body, feedback, to_json(
                 [{**c, "source": source} for c in rag_context]),
             utcnow_iso()),
        )
    return _record_step(run_id, seq, "send_email",
                        f"Draft queued for approval (email #{email['id']}, "
                        f"{category}, source={source})")


def run_workflow(run_id: int) -> None:
    """Background-thread entry point for a run."""
    seq = 0
    try:
        if settings.mode == "live":
            synced = _sync_gmail_inbox()
            if synced:
                seq = _record_step(run_id, seq, "load_inbox_emails",
                                   f"Synced {synced} new email(s) from Gmail")
        emails = _get_unanswered_emails()
        if not emails:
            seq = _record_step(run_id, seq, "is_email_inbox_empty",
                               "Inbox empty — nothing to process")
            _finish_run(run_id, "completed")
            return
        for email in emails:
            seq = _process_one_email(run_id, seq, email)
        _finish_run(run_id, "completed")
    except Exception:
        traceback.print_exc()
        _record_step(run_id, seq, "error", "run failed", status="failed")
        _finish_run(run_id, "failed")
