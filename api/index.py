"""Vercel serverless entrypoint for the Mailroom API.

Vercel's Python runtime treats api/index.py as a serverless function; when it
finds an ASGI `app` object it serves it. The FastAPI application lives in
backend/, so that directory is added to sys.path. vercel.json rewrites
/api/* to this function, and the original request path is preserved, so the
app's /api/... routes match as usual.

Environment variables are set in the Vercel dashboard (see README.md).
On Vercel the filesystem is ephemeral: set MAILROOM_DB_PATH=/tmp/mailroom.db
so the SQLite store has a writable location (it re-seeds on cold start).
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app  # noqa: E402,F401  (FastAPI app served by Vercel)
