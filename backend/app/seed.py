"""Startup seeding: KB + (demo mode only) mock inbox, idempotent."""
from . import kb
from .config import settings
from .mock_engine import seed_emails


def seed_all() -> dict:
    # The starter KB (agency.txt) always seeds — it is the product's
    # knowledge base, and the user replaces it with their own docs.
    kb.seed_kb()
    # Fake inbox emails ONLY in explicit demo mode. Live mode starts with
    # an empty inbox until Gmail is connected (or mail arrives).
    seeded = seed_emails() if settings.mode == "mock" else 0
    return {"kb_docs": len(kb.list_docs()), "emails_seeded": seeded}
