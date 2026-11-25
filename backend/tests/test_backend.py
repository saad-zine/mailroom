"""Mailroom backend tests (FastAPI TestClient).

The session client runs in explicit mock mode (see conftest.py) so the
workflow, approval gate and KB are covered end to end with the demo
engine. The live-mode tests below assert the opposite: with no key the
app is honest about it — live mode reports the missing key, refuses to
run, and never seeds fake mail.
"""
import io

import pytest

from app import kb
from app.config import settings
from app.mock_engine import categorize


def test_health_returns_200_mode_mock(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["mode"] == "mock"
    assert data["demo"] is True
    assert data["gmail_connected"] is False


def test_mock_categorize_routing_all_four_categories(client):
    assert categorize("What are your pricing options? How much is the Pro plan?") \
        == "product_enquiry"
    assert categorize("I was charged twice, please refund the duplicate charge") \
        == "customer_complaint"
    assert categorize("Suggestion: it would be great if you added a Slack "
                      "integration, I would love that") == "customer_feedback"
    assert categorize("CONGRATULATIONS you won a crypto lottery prize, "
                      "claim your reward") == "unrelated"
    # The seeded inbox itself covers all four categories.
    resp = client.get("/api/emails?limit=50")
    assert resp.status_code == 200
    cats = {e["category"] for e in resp.json()["emails"]}
    assert cats == {"product_enquiry", "customer_complaint",
                    "customer_feedback", "unrelated"}


def test_mock_run_completes_end_to_end_and_produces_pending_drafts(client):
    run = client.get(f"/api/runs/{client.run_id}").json()
    assert run["status"] == "completed"
    nodes = {s["node"] for s in run["steps"]}
    # The 9-node workflow ran: load, categorize, RAG for product mail,
    # writer, proofreader, queue.
    for expected in ("load_inbox_emails", "categorize_email",
                     "construct_rag_queries", "retrieve_from_rag",
                     "email_writer", "email_proofreader", "send_email"):
        assert expected in nodes, f"missing node {expected} in {nodes}"
    drafts = client.get("/api/drafts?status=pending").json()["drafts"]
    # 7 seeded emails minus 1 unrelated (skipped) = 6 pending drafts.
    assert len(drafts) == 6, drafts
    assert all(d["status"] == "pending" for d in drafts)
    assert all(d["proofreader_feedback"] for d in drafts)
    assert all("Agentia Team" in d["body"] for d in drafts)


def test_approve_records_decision_and_second_approve_409(client):
    drafts = client.get("/api/drafts?status=pending").json()["drafts"]
    draft_id = drafts[0]["id"]
    resp = client.post(f"/api/drafts/{draft_id}/approve",
                       json={"note": "looks good"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["draft"]["status"] == "approved"
    # Decision recorded.
    stats = client.get("/api/stats").json()
    assert stats["approved"] >= 1
    # Second approve must fail.
    resp2 = client.post(f"/api/drafts/{draft_id}/approve", json={})
    assert resp2.status_code == 409


def test_reject_blocks_sending(client):
    drafts = client.get("/api/drafts?status=pending").json()["drafts"]
    draft_id = drafts[0]["id"]
    resp = client.post(f"/api/drafts/{draft_id}/reject",
                       json={"reason": "wrong tone, do not send"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["draft"]["status"] == "rejected"
    # A rejected draft can NEVER be approved afterwards.
    resp2 = client.post(f"/api/drafts/{draft_id}/approve", json={})
    assert resp2.status_code == 409
    assert client.get(f"/api/drafts/{draft_id}").json()["draft"]["status"] \
        == "rejected"
    # No Gmail draft was created (mock mode, Gmail not connected).
    assert client.get("/health").json()["gmail_connected"] is False


def test_kb_upload_and_retrieve_returns_seed_content(client):
    # Seed content is retrievable: agency.txt was seeded on first start.
    hits = kb.retrieve("Pro Plan pricing $49 per month", k=5)
    assert hits, "KB retrieve returned nothing for a pricing query"
    assert any("Pro Plan" in h["chunk"] or "$49" in h["chunk"]
               for h in hits), hits
    # Upload a new doc, then retrieve it.
    resp = client.post(
        "/api/kb/upload",
        files={"file": ("support-note.txt",
                        io.BytesIO(b"Zebra support note: the refund window "
                                   b"is thirty days for Pro plan customers."),
                        "text/plain")},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["chunks"] >= 1
    hits = kb.retrieve("refund window thirty days zebra")
    assert any("Zebra support note" in h["chunk"] for h in hits), hits
    docs = client.get("/api/kb").json()["docs"]
    assert any(d["name"] == "support-note.txt" for d in docs)


def test_edit_draft_while_pending(client):
    drafts = client.get("/api/drafts?status=pending").json()["drafts"]
    draft_id = drafts[0]["id"]
    resp = client.put(f"/api/drafts/{draft_id}",
                      json={"body": "Dear Customer,\n\nEdited body.\n\nBest regards,\nThe Agentia Team"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["draft"]["body"].startswith("Dear Customer")


def test_stats_shape(client):
    stats = client.get("/api/stats").json()
    assert stats["total_emails"] == 7
    assert stats["by_category"]["product_enquiry"] == 3
    assert stats["by_category"]["customer_complaint"] == 2
    assert stats["by_category"]["customer_feedback"] == 1
    assert stats["by_category"]["unrelated"] == 1
    assert stats["pending_drafts"] + stats["approved"] + stats["rejected"] == 6


# ---------------------------------------------------------------- live mode
# These tests flip the (module-level) settings to live with no key and
# assert the app is honest about it instead of silently faking results.
# monkeypatch restores the settings after each test, so the mock-mode
# session client above is unaffected.

def test_live_mode_without_key_reports_setup(client, monkeypatch):
    monkeypatch.setattr(settings, "mode_setting", "live")
    monkeypatch.setattr(settings, "groq_api_key", "")
    health = client.get("/health").json()
    assert health["mode"] == "live"
    assert health["llm_available"] is False
    assert "GROQ_API_KEY" in health["missing_keys"]
    assert health["setup_hint"] and "GROQ_API_KEY" in health["setup_hint"]
    assert health["demo"] is False
    cfg = client.get("/api/settings").json()
    assert cfg["mode"] == "live"
    assert cfg["llm_available"] is False


def test_live_mode_without_key_refuses_runs(client, monkeypatch):
    monkeypatch.setattr(settings, "mode_setting", "live")
    monkeypatch.setattr(settings, "groq_api_key", "")
    resp = client.post("/api/runs")
    assert resp.status_code == 503, resp.text
    assert "GROQ_API_KEY" in resp.json()["detail"]


def test_seed_all_skips_mock_emails_in_live_mode(monkeypatch):
    from app import seed as seed_mod

    calls: list[int] = []

    def _counting_seed() -> int:
        calls.append(1)
        return 7

    monkeypatch.setattr(seed_mod, "seed_emails", _counting_seed)
    monkeypatch.setattr(settings, "mode_setting", "live")
    seed_mod.seed_all()
    assert calls == [], "live mode must not seed fake inbox emails"
    monkeypatch.setattr(settings, "mode_setting", "mock")
    seed_mod.seed_all()
    assert calls == [1], "explicit mock mode still seeds the demo inbox"


def test_nodes_raise_clear_error_without_llm_in_live_mode():
    """A node with no LLM chain and no fallback raises a setup error
    naming the missing key — it never silently produces a template draft."""
    from agent.nodes import Nodes
    from agent.state import Email

    nodes = Nodes(fallback=None)  # live mode: no mock fallback
    assert nodes.agents.categorize_email is None  # no GROQ_API_KEY here
    email = Email(
        id="1", threadId="t", messageId="", references="",
        sender="a@example.com", subject="Pricing?",
        body="What does the Pro plan cost?")
    state = {
        "emails": [email],
        "current_email": email,
        "email_category": "product_enquiry",
        "generated_email": "",
        "rag_queries": [],
        "retrieved_documents": "",
        "writer_messages": [],
        "sendable": False,
        "trials": 0,
    }
    with pytest.raises(RuntimeError, match="GROQ_API_KEY"):
        nodes.categorize_email(state)
    with pytest.raises(RuntimeError, match="GROQ_API_KEY"):
        nodes.write_draft_email(state)
