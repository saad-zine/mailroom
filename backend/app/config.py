"""Mailroom backend configuration.

Mailroom is a REAL product: live mode is the default. The LangGraph
workflow runs against the real Groq LLM, real Gmail, and real RAG
(Chroma + Gemini embeddings, or the keyword retriever over the real KB
when no Google key is set).

- MAILROOM_MODE=live (default) -> live mode. If GROQ_API_KEY is missing,
  the app still starts, but /health reports llm_available=false and
  POST /api/runs refuses with 503 + a setup message. Nothing is faked.
- MAILROOM_MODE=mock -> explicit DEMO mode only (seeded fake inbox,
  rule-based categorizer, template drafts). Never the default.

Gmail is only ever live when the user supplies a credentials.json
(see GMAIL_CREDENTIALS_PATH). No credentials are ever committed or invented.
"""
import base64
import json
import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
load_dotenv(BASE_DIR / ".env")
load_dotenv()  # also honour CWD / process env

VERSION = "0.1.0"
MODEL = "openai/gpt-oss-20b"


def _decode_json_env(value: str) -> str | None:
    """Decode an env var holding a JSON file's contents, either as raw
    JSON or base64-encoded JSON. Returns the JSON text, or None."""
    value = value.strip()
    if not value:
        return None
    if value.startswith("{"):
        return value  # raw JSON
    try:
        decoded = base64.b64decode(value, validate=True).decode("utf-8")
        json.loads(decoded)  # must be valid JSON
        return decoded
    except Exception:
        return None


def _materialize_gmail_files() -> None:
    """On serverless (Vercel) there is no persistent filesystem to hold
    credentials.json / token.json, so they are passed as env vars
    (GMAIL_CREDENTIALS_JSON / GMAIL_TOKEN_JSON, base64 or raw JSON) and
    materialized here into the temp dir, where GmailTools can read them
    as files. Sets GMAIL_CREDENTIALS_PATH / GMAIL_TOKEN_PATH so the
    rest of the app finds them. No-op when the env vars are unset
    (local dev keeps using files on disk)."""
    tmp = Path(tempfile.gettempdir())
    for env_name, path_env, filename in (
        ("GMAIL_CREDENTIALS_JSON", "GMAIL_CREDENTIALS_PATH",
         "mailroom-credentials.json"),
        ("GMAIL_TOKEN_JSON", "GMAIL_TOKEN_PATH", "mailroom-token.json"),
    ):
        text = _decode_json_env(os.environ.get(env_name, ""))
        if text is None:
            continue
        target = tmp / filename
        try:
            target.write_text(text, encoding="utf-8")
        except OSError:
            continue
        # Only set the path env var if the user hasn't pointed it
        # somewhere explicit already.
        if not os.environ.get(path_env):
            os.environ[path_env] = str(target)


def _db_path() -> Path:
    override = os.environ.get("MAILROOM_DB_PATH")
    return Path(override) if override else BASE_DIR / "mailroom.db"


def _checkpoints_path() -> Path:
    override = os.environ.get("MAILROOM_CHECKPOINTS_PATH")
    return Path(override) if override else BASE_DIR / "checkpoints.db"


class Settings:
    def __init__(self) -> None:
        # Materialize env-provided Gmail credentials FIRST so the
        # paths below resolve to them.
        _materialize_gmail_files()
        self.base_dir = BASE_DIR
        self.data_dir = BASE_DIR / "data"
        self.uploads_dir = BASE_DIR / "data" / "uploads"
        self.db_path = _db_path()
        self.checkpoints_path = _checkpoints_path()
        self.groq_api_key = os.environ.get("GROQ_API_KEY", "").strip()
        self.google_api_key = os.environ.get("GOOGLE_API_KEY", "").strip()
        self.mode_setting = os.environ.get("MAILROOM_MODE", "live").strip().lower()
        self.database_url = os.environ.get("DATABASE_URL", "").strip()
        self.gmail_credentials_path = os.environ.get(
            "GMAIL_CREDENTIALS_PATH", ""
        ).strip()
        self.gmail_token_path = os.environ.get(
            "GMAIL_TOKEN_PATH", ""
        ).strip()
        self.my_email = os.environ.get("MY_EMAIL", "").strip()

    @property
    def mode(self) -> str:
        """Resolved mode: 'live' (default) or 'mock' (explicit demo only)."""
        if self.mode_setting == "mock":
            return "mock"
        # "live", "auto" (legacy) and anything else all mean live.
        return "live"

    @property
    def llm_available(self) -> bool:
        """True when a Groq key is configured (the LLM agents can run)."""
        return bool(self.groq_api_key)

    @property
    def vector_rag_available(self) -> bool:
        """True when a Google key is configured (Chroma vector RAG)."""
        return bool(self.google_api_key)

    @property
    def missing_keys(self) -> list[str]:
        """API keys the live mode still needs. GROQ_API_KEY is required
        for the agents; GOOGLE_API_KEY is optional (without it, RAG uses
        the keyword retriever over the real KB instead of Chroma)."""
        missing = []
        if not self.groq_api_key:
            missing.append("GROQ_API_KEY")
        return missing

    @property
    def setup_hint(self) -> str | None:
        """Human-readable setup message when live mode cannot run, else None."""
        if self.mode == "mock":
            return None
        if self.llm_available:
            return None
        return (
            "GROQ_API_KEY is not set. Mailroom needs a Groq API key to run "
            "the email agents — get one free at console.groq.com and set "
            "GROQ_API_KEY (see backend/.env.example). "
            "Gmail stays disconnected until you add credentials.json "
            "(see README)."
        )

    @property
    def demo_mode(self) -> bool:
        return self.mode == "mock"

    @property
    def provider(self) -> str:
        return "groq" if self.mode == "live" else "mock"

    @property
    def model(self) -> str:
        return MODEL if self.mode == "live" else "mock-rule-based"

    @property
    def gmail_connected(self) -> bool:
        """True only if a Gmail credentials file / token actually exists.

        Gmail OAuth: the user creates a Google Cloud OAuth client, downloads
        credentials.json and points GMAIL_CREDENTIALS_PATH at it (or places it
        at backend/credentials.json). The first run performs the OAuth flow
        and stores token.json next to it. NEVER commit either file.
        """
        candidates = []
        if self.gmail_credentials_path:
            candidates.append(Path(self.gmail_credentials_path))
        if self.gmail_token_path:
            candidates.append(Path(self.gmail_token_path))
        candidates += [
            BASE_DIR / "credentials.json",
            BASE_DIR / "token.json",
            Path("credentials.json"),
            Path("token.json"),
        ]
        return any(p.exists() for p in candidates)


settings = Settings()
