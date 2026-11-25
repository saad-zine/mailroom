"""Mailroom backend configuration.

Mode resolution:
- MAILROOM_MODE=mock  -> mock mode (rule-based categorizer, template drafts,
  keyword RAG over the local KB). Default when no keys are present.
- MAILROOM_MODE=live  -> live mode (real Groq LLM workflow).
- MAILROOM_MODE=auto (default) -> live when GROQ_API_KEY is set, else mock.

Gmail is only ever live when the user supplies a credentials.json
(see GMAIL_CREDENTIALS_PATH). No credentials are ever committed or invented.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
load_dotenv(BASE_DIR / ".env")
load_dotenv()  # also honour CWD / process env

VERSION = "0.1.0"
MODEL = "llama-3.3-70b-versatile"


def _db_path() -> Path:
    override = os.environ.get("MAILROOM_DB_PATH")
    return Path(override) if override else BASE_DIR / "mailroom.db"


def _checkpoints_path() -> Path:
    override = os.environ.get("MAILROOM_CHECKPOINTS_PATH")
    return Path(override) if override else BASE_DIR / "checkpoints.db"


class Settings:
    def __init__(self) -> None:
        self.base_dir = BASE_DIR
        self.data_dir = BASE_DIR / "data"
        self.uploads_dir = BASE_DIR / "data" / "uploads"
        self.db_path = _db_path()
        self.checkpoints_path = _checkpoints_path()
        self.groq_api_key = os.environ.get("GROQ_API_KEY", "").strip()
        self.google_api_key = os.environ.get("GOOGLE_API_KEY", "").strip()
        self.mode_setting = os.environ.get("MAILROOM_MODE", "auto").strip().lower()
        self.database_url = os.environ.get("DATABASE_URL", "").strip()
        self.gmail_credentials_path = os.environ.get(
            "GMAIL_CREDENTIALS_PATH", ""
        ).strip()
        self.my_email = os.environ.get("MY_EMAIL", "").strip()

    @property
    def mode(self) -> str:
        """Resolved mode: 'mock' or 'live'."""
        if self.mode_setting == "mock":
            return "mock"
        if self.mode_setting == "live":
            return "live"
        # auto
        return "live" if self.groq_api_key else "mock"

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
        candidates += [
            BASE_DIR / "credentials.json",
            BASE_DIR / "token.json",
            Path("credentials.json"),
            Path("token.json"),
        ]
        return any(p.exists() for p in candidates)


settings = Settings()
