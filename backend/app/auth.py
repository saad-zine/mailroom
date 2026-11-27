"""Authentication and workspace scoping.

When SUPABASE_URL is configured, every data request must carry a Supabase
access token; the token's `sub` becomes the workspace id. Without it, local
development and tests use a single 'local' workspace so the existing demo
keeps working.
"""
import hmac

import jwt
from fastapi import HTTPException, Request

from .config import settings

_JWKS_URL = None


def _ensure_seeded(workspace: str) -> None:
    from .seed import ensure_workspace

    ensure_workspace(workspace)


def _jwks_url() -> str:
    global _JWKS_URL
    if _JWKS_URL is None:
        _JWKS_URL = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    return _JWKS_URL


def verify_token(token: str) -> dict:
    """Verify a Supabase access token and return its claims."""
    try:
        if settings.supabase_jwt_secret:
            return jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        client = jwt.PyJWKClient(_jwks_url())
        signing_key = client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience="authenticated",
        )
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc


def current_workspace(request: Request) -> str:
    """FastAPI dependency: the workspace id for this request."""
    if not settings.auth_enabled:
        request.state.claims = {}
        _ensure_seeded("local")
        return "local"
    header = request.headers.get("Authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    claims = verify_token(header.split(None, 1)[1])
    request.state.claims = claims
    workspace = claims.get("sub")
    if not workspace:
        raise HTTPException(status_code=401, detail="Token has no subject")
    _ensure_seeded(workspace)
    return workspace


def require_cron_secret(request: Request) -> None:
    """Vercel Cron sends Authorization: Bearer $CRON_SECRET automatically."""
    if not settings.cron_secret:
        return
    header = request.headers.get("Authorization", "")
    expected = f"Bearer {settings.cron_secret}"
    if not hmac.compare_digest(header, expected):
        raise HTTPException(status_code=401, detail="Invalid cron secret")
