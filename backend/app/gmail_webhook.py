"""Gmail Pub/Sub push webhook.

The notification itself is tiny (emailAddress + historyId). We verify
Google's signed JWT, then fetch the real message bodies from the Gmail API
and store them in Postgres before queuing processing jobs.
"""
import base64
import json
from typing import Any

import jwt
from fastapi import HTTPException, Request

from . import gmail_cloud
from .config import settings
from .db import connect, utcnow_iso

_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"


def verify_google_jwt(request: Request) -> dict:
    header = request.headers.get("Authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing push token")
    token = header.split(None, 1)[1]
    try:
        client = jwt.PyJWKClient(_CERTS_URL)
        key = client.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            key.key,
            algorithms=["RS256"],
            issuer="https://accounts.google.com",
            options={"verify_aud": False},
        )
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid push token") from exc
    if settings.pubsub_audience and claims.get("aud") != settings.pubsub_audience:
        raise HTTPException(status_code=401, detail="Invalid push audience")
    return claims


def _decode_message(message: dict[str, Any]) -> dict:
    data = message.get("data")
    if not data:
        return {}
    padded = data + "=" * (-len(data) % 4)
    return json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))


def workspace_for_email(email: str) -> str | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT workspace_id FROM gmail_connections "
            "WHERE email_address = ? AND status = 'connected'",
            (email,),
        ).fetchone()
    return row[0] if row else None


def store_message(workspace: str, message: dict) -> int | None:
    """Insert a Gmail message once. Returns its DB id, or None if duplicate."""
    provider_id = message["provider_message_id"]
    with connect() as conn:
        seen = conn.execute(
            "SELECT 1 FROM processed_messages WHERE workspace_id=? AND provider_message_id=?",
            (workspace, provider_id),
        ).fetchone()
        if seen:
            return None
        row = conn.execute(
            """INSERT INTO emails(workspace_id, thread_id, sender, subject, snippet,
                   body, category, status, received_at, source, provider_message_id,
                   history_id, rfc_message_id, references_header)
               VALUES (?, ?, ?, ?, ?, ?, '', 'new', ?, 'live', ?, ?, ?, ?)
               RETURNING id""",
            (
                workspace,
                message.get("thread_id"),
                message.get("sender"),
                message.get("subject"),
                " ".join((message.get("body") or "").split())[:160],
                message.get("body") or "",
                message.get("received_at") or utcnow_iso(),
                provider_id,
                message.get("history_id"),
                message.get("rfc_message_id"),
                message.get("references"),
            ),
        ).fetchone()
        conn.execute(
            "INSERT INTO processed_messages(workspace_id, provider_message_id, thread_id, created_at) "
            "VALUES (?, ?, ?, ?)",
            (workspace, provider_id, message.get("thread_id"), utcnow_iso()),
        )
        email_id = row[0]
        conn.execute(
            "INSERT INTO jobs(workspace_id, email_id, kind, status, created_at) "
            "VALUES (?, ?, 'process_email', 'pending', ?)",
            (workspace, email_id, utcnow_iso()),
        )
    return email_id


def handle_push(payload: dict) -> dict:
    """Verify, fetch bodies, dedupe, enqueue. Called by the webhook endpoint."""
    notification = _decode_message(payload.get("message", {}))
    email_address = notification.get("emailAddress")
    history_id = notification.get("historyId")
    if not email_address or not history_id:
        raise HTTPException(status_code=400, detail="Malformed push notification")

    workspace = workspace_for_email(email_address)
    if not workspace:
        return {"accepted": False, "reason": "no connection for this address"}

    start = history_id
    ids = gmail_cloud.history_message_ids(workspace, start)
    stored = 0
    for message_id in ids[:25]:
        try:
            message = gmail_cloud.fetch_message(workspace, message_id)
        except Exception:
            continue
        if store_message(workspace, message):
            stored += 1

    with connect() as conn:
        conn.execute(
            "UPDATE gmail_connections SET history_id=?, last_sync_at=? WHERE workspace_id=?",
            (history_id, utcnow_iso(), workspace),
        )
    return {"accepted": True, "messages": stored, "workspace": workspace}
