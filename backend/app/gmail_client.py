"""Gmail client wrapper.

Live Gmail only exists when the user supplies credentials (see
config.Settings.gmail_connected). In mock mode every call is a safe no-op
that reports gmail_connected=False — nothing is ever sent without a human
approving a draft first, and approve-in-mock-mode only marks the draft
approved in the local DB (labelled mock), it never touches Gmail.
"""
from .config import settings


def gmail_connected() -> bool:
    return settings.gmail_connected


def create_gmail_draft(email: dict, draft_body: str):
    """Create a Gmail draft reply via the base GmailTools.

    Returns the Gmail draft dict, or None when Gmail is not connected /
    creation fails. Never raises for missing credentials.
    """
    if not gmail_connected():
        return None
    try:
        # Imported lazily: constructing GmailToolsClass no longer starts an
        # OAuth flow when no credentials exist (see agent/tools/GmailTools.py).
        from agent.tools.GmailTools import GmailToolsClass

        tools = GmailToolsClass()
        if not getattr(tools, "available", False):
            return None

        class _Email:
            pass

        e = _Email()
        e.sender = email.get("sender", "")
        e.subject = email.get("subject", "")
        e.threadId = email.get("thread_id", "")
        e.messageId = ""
        e.references = ""
        return tools.create_draft_reply(e, draft_body)
    except Exception as exc:  # graceful degradation, never crash the API
        print(f"[gmail] create_draft_reply failed: {exc}")
        return None
