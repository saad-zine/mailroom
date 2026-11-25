"""Startup seeding: KB + mock inbox, idempotent."""
from . import kb
from .mock_engine import seed_emails


def seed_all() -> dict:
    kb.seed_kb()
    seeded = seed_emails()
    return {"kb_docs": len(kb.list_docs()), "emails_seeded": seeded}
