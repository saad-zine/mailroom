"""Hosted Gmail integration: OAuth, token storage, and raw Gmail API calls.

Uses httpx only (no google-api-python-client), so it stays inside Vercel's
function size limit. Refresh tokens are encrypted at rest with Fernet.
"""
import base64
import hashlib
import hmac
import json
import time
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from email.utils import parseaddr
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet

from .config import settings
from .db import connect, utcnow_iso

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
API = "https://gmail.googleapis.com/gmail/v1/users/me"
SCOPES = " ".join([
    "openid",
    "email",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
])


def _fernet() -> Fernet:
    key = settings.token_encryption_key
    if not key:
        key = base64.urlsafe_b64encode(
            hashlib.sha256(b"mailroom-local-dev-token-key").digest()
        ).decode()
    return Fernet(key.encode())


def _encrypt(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def _decrypt(value: str) -> str:
    return _fernet().decrypt(value.encode()).decode()


def _secret() -> bytes:
    return (settings.token_encryption_key or settings.google_client_secret or "dev").encode()


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


# ---------------------------------------------------------------- OAuth state

def _make_state(workspace: str) -> str:
    payload = _b64url(
        json.dumps({"workspace": workspace, "exp": int(time.time()) + 600}).encode()
    )
    signature = hmac.new(_secret(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"


def _read_state(state: str) -> str:
    try:
        payload, signature = state.split(".", 1)
    except ValueError as exc:
        raise ValueError("Invalid OAuth state") from exc
    expected = hmac.new(_secret(), payload.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise ValueError("Invalid OAuth state")
    data = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    if int(data.get("exp", 0)) < int(time.time()):
        raise ValueError("OAuth state expired")
    return str(data["workspace"])


def authorize_url(workspace: str) -> str:
    if not settings.gmail_oauth_configured:
        raise RuntimeError("Gmail OAuth is not configured")
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.gmail_redirect_uri,
        "response_type": "code",
        "scope": SCOPES,
        "state": _make_state(workspace),
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
    }
    return f"{AUTH_URL}?{urlencode(params)}"


def exchange_code(code: str, state: str) -> str:
    """Exchange an OAuth code, store the encrypted token, start a watch.

    Returns the workspace id from the signed state.
    """
    workspace = _read_state(state)
    response = httpx.post(
        TOKEN_URL,
        data={
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": settings.gmail_redirect_uri,
            "grant_type": "authorization_code",
            "code": code,
        },
        timeout=20,
    )
    response.raise_for_status()
    token = response.json()
    refresh_token = token.get("refresh_token")
    if not refresh_token:
        raise RuntimeError("Google did not return a refresh token")
    profile = httpx.get(
        USERINFO_URL,
        headers={"Authorization": f"Bearer {token['access_token']}"},
        timeout=20,
    )
    profile.raise_for_status()
    email = profile.json().get("email") or "unknown"

    expires = (
        (datetime.now(timezone.utc) + timedelta(seconds=int(token.get("expires_in", 3600))))
        .isoformat()
    )
    with connect() as conn:
        existing = conn.execute(
            "SELECT id FROM gmail_connections WHERE workspace_id = ?", (workspace,)
        ).fetchone()
        values = (
            email,
            _encrypt(refresh_token),
            _encrypt(token["access_token"]),
            expires,
            token.get("scope", SCOPES),
            utcnow_iso(),
            "connected",
            utcnow_iso(),
        )
        if existing:
            conn.execute(
                """UPDATE gmail_connections SET email_address=?, refresh_token_enc=?,
                   access_token_enc=?, access_expires_at=?, scopes=?, last_sync_at=?,
                   status=? WHERE workspace_id=?""",
                values + (workspace,),
            )
        else:
            conn.execute(
                """INSERT INTO gmail_connections(workspace_id, email_address,
                   refresh_token_enc, access_token_enc, access_expires_at, scopes,
                   last_sync_at, status, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (workspace,) + values,
            )
    start_watch(workspace)
    return workspace


# ---------------------------------------------------------------- token access

def connection(workspace: str) -> dict | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM gmail_connections WHERE workspace_id = ? AND status='connected'",
            (workspace,),
        ).fetchone()
    return dict(row) if row else None


def access_token(row: dict) -> str:
    expires = row.get("access_expires_at")
    if row.get("access_token_enc") and expires:
        try:
            expiry = datetime.fromisoformat(expires)
            if expiry > datetime.now(timezone.utc) + timedelta(minutes=2):
                return _decrypt(row["access_token_enc"])
        except ValueError:
            pass

    response = httpx.post(
        TOKEN_URL,
        data={
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "grant_type": "refresh_token",
            "refresh_token": _decrypt(row["refresh_token_enc"]),
        },
        timeout=20,
    )
    response.raise_for_status()
    token = response.json()
    new_token = token["access_token"]
    new_expiry = (
        datetime.now(timezone.utc)
        + timedelta(seconds=int(token.get("expires_in", 3600)))
    ).isoformat()
    with connect() as conn:
        conn.execute(
            "UPDATE gmail_connections SET access_token_enc=?, access_expires_at=? "
            "WHERE workspace_id=?",
            (_encrypt(new_token), new_expiry, row["workspace_id"]),
        )
    return new_token


def _headers(workspace: str) -> dict:
    row = connection(workspace)
    if not row:
        raise RuntimeError("Gmail is not connected")
    return {"Authorization": f"Bearer {access_token(row)}"}


# ---------------------------------------------------------------- Gmail API

def start_watch(workspace: str) -> str | None:
    if not settings.pubsub_topic:
        return None
    response = httpx.post(
        f"{API}/watch",
        headers=_headers(workspace),
        json={"topicName": settings.pubsub_topic, "labelIds": ["INBOX"]},
        timeout=20,
    )
    response.raise_for_status()
    data = response.json()
    with connect() as conn:
        conn.execute(
            "UPDATE gmail_connections SET history_id=?, watch_expires_at=?, last_sync_at=? "
            "WHERE workspace_id=?",
            (data.get("historyId"), data.get("expiration"), utcnow_iso(), workspace),
        )
    return data.get("historyId")


def stop_watch(workspace: str) -> None:
    try:
        httpx.post(f"{API}/stop", headers=_headers(workspace), timeout=15)
    except Exception:
        pass


def history_message_ids(workspace: str, start_history_id: str) -> list[str]:
    response = httpx.get(
        f"{API}/history",
        headers=_headers(workspace),
        params={
            "startHistoryId": start_history_id,
            "historyTypes": "messageAdded",
            "labelId": "INBOX",
            "maxResults": 100,
        },
        timeout=25,
    )
    response.raise_for_status()
    ids = []
    for record in response.json().get("history", []):
        for added in record.get("messagesAdded", []):
            message = added.get("message", {})
            if message.get("id"):
                ids.append(message["id"])
    return list(dict.fromkeys(ids))


def fetch_message(workspace: str, message_id: str) -> dict:
    response = httpx.get(
        f"{API}/messages/{message_id}",
        headers=_headers(workspace),
        params={"format": "full"},
        timeout=25,
    )
    response.raise_for_status()
    data = response.json()
    headers = {
        h["name"].lower(): h["value"]
        for h in data.get("payload", {}).get("headers", [])
    }
    return {
        "provider_message_id": message_id,
        "rfc_message_id": headers.get("message-id"),
        "references": headers.get("references"),
        "thread_id": data.get("threadId"),
        "history_id": data.get("historyId"),
        "sender": headers.get("from", ""),
        "subject": headers.get("subject", ""),
        "body": _extract_body(data.get("payload", {})),
        "received_at": _internal_date(data.get("internalDate")),
    }


def _internal_date(value: str | None) -> str:
    if not value:
        return utcnow_iso()
    try:
        return datetime.fromtimestamp(int(value) / 1000, timezone.utc).isoformat()
    except (ValueError, TypeError):
        return utcnow_iso()


def _extract_body(payload: dict) -> str:
    if payload.get("mimeType") == "text/plain" and payload.get("body", {}).get("data"):
        return _decode(payload["body"]["data"])
    for part in payload.get("parts", []):
        mime = part.get("mimeType", "")
        if mime in ("text/plain", "text/html"):
            data = part.get("body", {}).get("data")
            if data:
                text = _decode(data)
                if mime == "text/html":
                    from bs4 import BeautifulSoup

                    text = BeautifulSoup(text, "html.parser").get_text("\n")
                return text.strip()
        found = _extract_body(part)
        if found:
            return found
    return ""


def _decode(data: str) -> str:
    padded = data + "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(padded).decode("utf-8", errors="replace")


def create_draft(workspace: str, email: dict, body: str) -> str | None:
    to = parseaddr(email.get("sender") or "")[1] or email.get("sender") or ""
    message = MIMEText(body, "plain", "utf-8")
    message["To"] = to
    message["Subject"] = "Re: " + (email.get("subject") or "").removeprefix("Re: ")
    if email.get("rfc_message_id"):
        message["In-Reply-To"] = email["rfc_message_id"]
        message["References"] = email.get("references_header") or email["rfc_message_id"]
    payload = {"message": {"raw": _b64url(message.as_bytes())}}
    if email.get("thread_id"):
        payload["message"]["threadId"] = email["thread_id"]
    response = httpx.post(f"{API}/drafts", headers=_headers(workspace), json=payload, timeout=25)
    if response.status_code >= 400:
        return None
    return response.json().get("id")


# ---------------------------------------------------------------- status

def status(workspace: str) -> dict:
    row = connection(workspace)
    if not row:
        return {
            "connected": False,
            "email": None,
            "last_sync_at": None,
            "watch_expires_at": None,
            "scopes": [],
        }
    return {
        "connected": True,
        "email": row.get("email_address"),
        "last_sync_at": row.get("last_sync_at"),
        "watch_expires_at": row.get("watch_expires_at"),
        "scopes": (row.get("scopes") or "").split(),
    }


def disconnect(workspace: str) -> None:
    try:
        stop_watch(workspace)
    finally:
        with connect() as conn:
            conn.execute(
                "UPDATE gmail_connections SET status='disconnected' WHERE workspace_id=?",
                (workspace,),
            )
