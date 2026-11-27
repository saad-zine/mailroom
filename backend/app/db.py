"""Persistence: emails, drafts, decisions, KB docs, runs, run steps.

Two backends, chosen by environment — the application code is written
once and never sees the difference:
- Postgres (Supabase) when DATABASE_URL is set (postgresql://...).
  This is the deployment backend: it survives serverless cold starts,
  so emails, drafts and decisions persist on Vercel.
- SQLite (local file) otherwise. This is the local-dev backend and
  what the tests use.

The SQL in the app is written SQLite-style (`?` placeholders,
`INTEGER PRIMARY KEY AUTOINCREMENT`). The Postgres connection
translates those to Postgres (`%s`, SERIAL) transparently, and
returns rows that support both positional (row[0]) and key
(row["id"]) access, like sqlite3.Row. Callers never see the
difference. One rule this imposes: to get a newly inserted id, use
`INSERT ... RETURNING id` + fetchone() — never cursor.lastrowid
(which is SQLite-only).
"""
import json
import re
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
CREATE TABLE IF NOT EXISTS gmail_connections(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id TEXT NOT NULL UNIQUE,
    email_address TEXT NOT NULL,
    refresh_token_enc TEXT NOT NULL,
    access_token_enc TEXT,
    access_expires_at TEXT,
    scopes TEXT DEFAULT '',
    history_id TEXT,
    watch_expires_at TEXT,
    last_sync_at TEXT,
    status TEXT DEFAULT 'connected',
    created_at TEXT
);
CREATE TABLE IF NOT EXISTS processed_messages(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id TEXT NOT NULL,
    provider_message_id TEXT NOT NULL,
    thread_id TEXT,
    created_at TEXT,
    UNIQUE(workspace_id, provider_message_id)
);
CREATE TABLE IF NOT EXISTS jobs(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id TEXT NOT NULL,
    email_id INTEGER,
    kind TEXT DEFAULT 'process_email',
    status TEXT DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    error TEXT,
    created_at TEXT
);
CREATE TABLE IF NOT EXISTS audit_logs(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT,
    detail TEXT,
    created_at TEXT
);
"""

# Postgres DDL: same tables, SERIAL instead of AUTOINCREMENT. TEXT and
# REFERENCES are valid in both dialects, so one string replace is all
# the schema translation needs.
SCHEMA_PG = SCHEMA.replace(
    "INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")


def use_postgres() -> bool:
    """True when DATABASE_URL points at a Postgres (Supabase) database."""
    url = (settings.database_url or "").strip()
    return url.startswith(("postgres://", "postgresql://"))


def db_path() -> Path:
    return settings.db_path


# ------------------------------------------------------------------ Postgres
class PgRow:
    """A row that behaves like sqlite3.Row: positional access (row[0])
    AND key access (row["id"]), plus .keys() and .get() so dict(row)
    and row.get(...) both work."""

    def __init__(self, columns, values):
        self._columns = list(columns)
        self._values = list(values)
        self._map = dict(zip(self._columns, self._values))

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._values[key]
        return self._map[key]

    def __iter__(self):
        return iter(self._values)

    def __len__(self):
        return len(self._values)

    def keys(self):
        return list(self._columns)

    def get(self, key, default=None):
        return self._map.get(key, default)


def _pg_row_factory(cursor):
    """psycopg row_factory: build a PgRow from each result tuple."""
    if cursor.description is None:
        # Statement with no result set (CREATE TABLE, INSERT without
        # RETURNING, UPDATE, DELETE). No rows are ever produced, so
        # this maker is never called — return a harmless placeholder.
        return lambda values: ()
    columns = [d.name for d in cursor.description]

    def make_row(values):
        return PgRow(columns, values)

    return make_row


def _to_pg_sql(sql: str) -> str:
    """Translate SQLite-style `?` placeholders to Postgres `%s`.

    Quote-aware: a `?` inside a single-quoted literal (e.g. a LIKE
    pattern) is left alone. The app's SQL has no literal `?` today,
    but this keeps a future one from silently breaking.
    """
    out = []
    in_str = False
    i = 0
    while i < len(sql):
        ch = sql[i]
        if ch == "'":
            # '' is an escaped quote inside a literal.
            if in_str and i + 1 < len(sql) and sql[i + 1] == "'":
                out.append("''")
                i += 2
                continue
            in_str = not in_str
            out.append(ch)
        elif ch == "?" and not in_str:
            out.append("%s")
        else:
            out.append(ch)
        i += 1
    return "".join(out)


class _PgCursor:
    """Thin wrapper around a psycopg cursor: translates the SQL, then
    delegates fetch/rowcount/iteration."""

    def __init__(self, cur):
        self._cur = cur

    def execute(self, sql, params=None):
        return self._cur.execute(_to_pg_sql(sql), params)

    def fetchone(self):
        return self._cur.fetchone()

    def fetchall(self):
        return self._cur.fetchall()

    def __iter__(self):
        return iter(self._cur)

    @property
    def rowcount(self):
        return self._cur.rowcount


class _PgConnection:
    """Thin wrapper around a psycopg connection so it exposes the same
    surface the app already uses: execute() returning a cursor,
    executescript() for the schema, commit()/close()."""

    def __init__(self, conn):
        self._conn = conn

    def execute(self, sql, params=None):
        cur = self._conn.execute(_to_pg_sql(sql), params)
        return _PgCursor(cur)

    def executescript(self, sql):
        # psycopg has no executescript: split the DDL on ';' and run
        # each statement. Safe here — the schema has no ';' inside a
        # literal.
        for stmt in sql.split(";"):
            stmt = stmt.strip()
            if stmt:
                self._conn.execute(stmt)

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()


@contextmanager
def connect():
    if use_postgres():
        import psycopg

        conn = psycopg.connect(settings.database_url,
                               row_factory=_pg_row_factory)
        pg = _PgConnection(conn)
        try:
            yield pg
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
        return

    conn = sqlite3.connect(str(db_path()))
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        yield conn
        conn.commit()
    finally:
        conn.close()


TENANT_COLUMNS = {
    "emails": [
        ("workspace_id", "TEXT DEFAULT 'local'"),
        ("provider_message_id", "TEXT"),
        ("history_id", "TEXT"),
        ("rfc_message_id", "TEXT"),
        ("references_header", "TEXT"),
    ],
    "drafts": [("workspace_id", "TEXT DEFAULT 'local'")],
    "decisions": [("workspace_id", "TEXT DEFAULT 'local'")],
    "kb_docs": [("workspace_id", "TEXT DEFAULT 'local'")],
    "kb_chunks": [("workspace_id", "TEXT DEFAULT 'local'")],
    "runs": [("workspace_id", "TEXT DEFAULT 'local'")],
    "run_steps": [("workspace_id", "TEXT DEFAULT 'local'")],
}


def _add_column(conn, table: str, name: str, definition: str) -> None:
    if use_postgres():
        conn.execute(
            f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {name} {definition}"
        )
        return
    try:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")
    except sqlite3.OperationalError as exc:
        if "duplicate column" not in str(exc).lower():
            raise


def init_db() -> None:
    if use_postgres():
        with connect() as conn:
            conn.executescript(SCHEMA_PG)
            for table, columns in TENANT_COLUMNS.items():
                for name, definition in columns:
                    _add_column(conn, table, name, definition)
        return
    db_path().parent.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.executescript(SCHEMA)
        for table, columns in TENANT_COLUMNS.items():
            for name, definition in columns:
                _add_column(conn, table, name, definition)


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
