"""SQLite persistence (stdlib sqlite3 only, no ORM).

Short-lived connections per call, WAL mode. One extra table beyond the
spec (kb_chunks) holds the actual chunk text; kb_docs.chunks is the count.
"""
import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from .config import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS emails(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id TEXT,
    sender TEXT,
    subject TEXT,
    snippet TEXT,
    body TEXT,
    category TEXT,
    status TEXT DEFAULT 'new',
    received_at TEXT,
    source TEXT DEFAULT 'mock'
);
CREATE TABLE IF NOT EXISTS drafts(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_id INTEGER REFERENCES emails(id),
    sender TEXT,
    subject TEXT,
    category TEXT,
    body TEXT,
    proofreader_feedback TEXT,
    rag_context_json TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT,
    decided_by TEXT,
    decision_note TEXT
);
CREATE TABLE IF NOT EXISTS decisions(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draft_id INTEGER REFERENCES drafts(id),
    action TEXT,
    note TEXT,
    decided_by TEXT,
    decided_at TEXT
);
CREATE TABLE IF NOT EXISTS kb_docs(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    chunks INTEGER DEFAULT 0,
    created_at TEXT
);
CREATE TABLE IF NOT EXISTS kb_chunks(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_id INTEGER REFERENCES kb_docs(id),
    chunk_text TEXT,
    source TEXT
);
CREATE TABLE IF NOT EXISTS runs(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id TEXT,
    status TEXT DEFAULT 'running',
    started_at TEXT,
    ended_at TEXT
);
CREATE TABLE IF NOT EXISTS run_steps(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER REFERENCES runs(id),
    seq INTEGER,
    node TEXT,
    detail TEXT,
    status TEXT,
    ts TEXT
);
"""


def db_path() -> Path:
    return settings.db_path


@contextmanager
def connect():
    conn = sqlite3.connect(str(db_path()))
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    db_path().parent.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.executescript(SCHEMA)


def row_to_dict(row):
    if row is None:
        return None
    return dict(row)


def utcnow_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()


def to_json(value) -> str:
    return json.dumps(value, ensure_ascii=False)


def from_json(text, default=None):
    if not text:
        return default
    try:
        return json.loads(text)
    except (ValueError, TypeError):
        return default
