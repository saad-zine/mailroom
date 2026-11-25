"""Knowledge base: chunking, storage and keyword retrieval.

Chunks live in kb_chunks (doc_id, chunk_text, source); kb_docs.chunks is the
count. Retrieval here is a keyword-overlap retriever over those chunks so
RAG works with no API keys. When GOOGLE_API_KEY is set, the live LangGraph
agents use a Chroma vector store instead (see agent/agents.py); this module
is the always-available fallback.
"""
import re
from pathlib import Path

from .config import settings
from .db import connect, utcnow_iso

CHUNK_SIZE = 300
CHUNK_OVERLAP = 50
STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with",
    "is", "are", "was", "were", "it", "its", "you", "your", "we", "our",
    "how", "what", "does", "do", "can", "i", "me", "my", "this", "that",
    "about", "please", "hello", "hi", "thanks", "thank",
}


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE,
               overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split text into overlapping chunks, preferring paragraph boundaries."""
    text = re.sub(r"\r\n?", "\n", text).strip()
    if not text:
        return []
    # Split on blank lines first, then pack paragraphs into chunks.
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    current = ""
    for para in paras:
        if len(current) + len(para) + 2 <= chunk_size:
            current = f"{current}\n\n{para}".strip()
        else:
            if current:
                chunks.append(current)
            if len(para) > chunk_size:
                # Hard-split a very long paragraph with overlap.
                start = 0
                while start < len(para):
                    chunks.append(para[start:start + chunk_size])
                    start += chunk_size - overlap
                current = ""
            else:
                current = para
    if current:
        chunks.append(current)
    return chunks


def add_doc(name: str, text: str, source: str | None = None) -> dict:
    """Store a doc and its chunks. Returns {id, name, chunks}."""
    chunks = chunk_text(text)
    src = source or name
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO kb_docs(name, chunks, created_at) VALUES (?, ?, ?)",
            (name, len(chunks), utcnow_iso()),
        )
        doc_id = cur.lastrowid
        for chunk in chunks:
            conn.execute(
                "INSERT INTO kb_chunks(doc_id, chunk_text, source) VALUES (?, ?, ?)",
                (doc_id, chunk, src),
            )
    return {"id": doc_id, "name": name, "chunks": len(chunks)}


def delete_doc(doc_id: int) -> bool:
    with connect() as conn:
        cur = conn.execute("DELETE FROM kb_docs WHERE id = ?", (doc_id,))
        conn.execute("DELETE FROM kb_chunks WHERE doc_id = ?", (doc_id,))
        return cur.rowcount > 0


def list_docs() -> list[dict]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT id, name, chunks, created_at FROM kb_docs ORDER BY id"
        ).fetchall()
    return [dict(r) for r in rows]


def _tokens(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9]+", text.lower())
    return {w for w in words if w not in STOPWORDS and len(w) > 2}


def retrieve(query: str, k: int = 3) -> list[dict]:
    """Keyword-overlap retrieval. Returns [{chunk, source}].

    Every result carries source 'mock' in mock mode (the chunk's own source
    is kept as the doc name; the mock marker lives in the run/draft record
    and in rag_context entries built by mock_engine).
    """
    query_tokens = _tokens(query)
    with connect() as conn:
        rows = conn.execute(
            "SELECT chunk_text, source FROM kb_chunks"
        ).fetchall()
    scored = []
    for row in rows:
        overlap = len(query_tokens & _tokens(row["chunk_text"]))
        if overlap:
            scored.append((overlap, row["chunk_text"], row["source"]))
    scored.sort(key=lambda x: -x[0])
    return [
        {"chunk": chunk, "source": source}
        for _, chunk, source in scored[:k]
    ]


def seed_kb() -> None:
    """Seed the KB with data/agency.txt on first start (idempotent)."""
    if list_docs():
        return
    agency = settings.data_dir / "agency.txt"
    if agency.exists():
        add_doc("agency.txt", agency.read_text(encoding="utf-8"), source="agency.txt")


def reindex() -> list[dict]:
    """Rebuild the index from backend/data/ (*.txt/*.md) + uploads.

    Deletes all docs/chunks and re-adds every .txt/.md file found under
    data/ (including data/uploads/).
    """
    with connect() as conn:
        conn.execute("DELETE FROM kb_chunks")
        conn.execute("DELETE FROM kb_docs")
    docs = []
    if settings.data_dir.exists():
        files = sorted(settings.data_dir.rglob("*.txt")) + sorted(
            settings.data_dir.rglob("*.md")
        )
        for path in files:
            try:
                text = path.read_text(encoding="utf-8")
            except (OSError, UnicodeDecodeError):
                continue
            if text.strip():
                docs.append(add_doc(path.name, text, source=path.name))
    return docs
