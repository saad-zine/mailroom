"""Startup seeding: KB + (demo mode only) mock inbox, idempotent."""
from . import kb
from .config import settings
from .mock_engine import seed_emails

_SEEDED: set[str] = set()


def seed_all() -> dict:
    """Local/dev seeding. Production workspaces are seeded on first request."""
    if settings.auth_enabled:
        return {"kb_docs": 0, "emails_seeded": 0}
    kb.seed_kb("local")
    seeded = seed_emails() if settings.mode == "mock" else 0
    return {"kb_docs": len(kb.list_docs("local")), "emails_seeded": seeded}


def ensure_workspace(workspace: str) -> None:
    """Give a new workspace the starter KB, once."""
    if workspace in _SEEDED:
        return
    try:
        kb.seed_kb(workspace)
    finally:
        _SEEDED.add(workspace)
