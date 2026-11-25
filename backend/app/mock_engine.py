"""Mock engine: rule-based categorizer, template drafts, mock RAG.

Used when no GROQ_API_KEY is set. Every mock response carries
source="mock" (see rag_context entries and run-step details).
"""
import re
from datetime import datetime, timedelta, timezone

from . import kb
from .db import connect, utcnow_iso

CATEGORIES = [
    "product_enquiry",
    "customer_complaint",
    "customer_feedback",
    "unrelated",
]

# Order matters: unrelated first (spam must not be mistaken for a product
# question), then complaint, then feedback, then product enquiry.
_UNRELATED = [
    "lottery", "won a prize", "you won", "prize", "crypto", "bitcoin",
    "casino", "investment opportunity", "double your money", "viagra",
    "inheritance", "claim your reward",
]
_COMPLAINT = [
    "charged twice", "billed twice", "double charged", "charged",
    "refund", "billing", "billed", "downtime", "outage", "platform is down",
    "is down", "not working", "broken", "unacceptable", "angry",
    "disappointed", "terrible", "cancel my subscription", "complaint",
    "frustrated", "still waiting",
]
_FEEDBACK = [
    "suggestion", "suggest", "would love", "please add", "feature request",
    "feedback", "it would be great", "idea", "improve", "wish",
]
_PRODUCT = [
    "pricing", "price", "cost", "how much", "plan", "plans",
    "does it support", "does agentia support", "support",
    "how do i", "how can i", "feature", "features", "integration",
    "integrate", "train", "rag", "template", "model", "models",
    "question", "trial", "free plan",
]


def _contains(text: str, keywords: list[str]) -> bool:
    return any(k in text for k in keywords)


def categorize(text: str) -> str:
    """Rule-based categorizer. Returns one of the 4 categories."""
    t = (text or "").lower()
    if _contains(t, _UNRELATED):
        return "unrelated"
    if _contains(t, _COMPLAINT):
        return "customer_complaint"
    if _contains(t, _FEEDBACK):
        return "customer_feedback"
    if _contains(t, _PRODUCT):
        return "product_enquiry"
    return "product_enquiry"


def _sender_name(sender: str) -> str:
    local = (sender or "").split("@")[0]
    local = re.sub(r"[._\-+]+", " ", local).strip()
    return local.title() if local else "Customer"


def build_draft(category: str, sender: str, subject: str, body: str,
                rag_context: list[dict]) -> str:
    """Template draft per category, grounded in RAG context when present."""
    name = _sender_name(sender)
    info = ""
    if rag_context:
        # Ground the answer in the single most relevant chunk, trimmed so
        # the draft stays concise (cut at a word boundary).
        info = rag_context[0]["chunk"][:800].rsplit(" ", 1)[0]
    if category == "product_enquiry":
        answer = (
            f"Based on our documentation: {info}" if info
            else "I would be happy to walk you through the details."
        )
        return (
            f"Dear {name},\n\nThank you for reaching out to the Agentia team "
            f"about \"{subject}\".\n\n{answer}\n\n"
            "Agentia offers a Free plan ($0/month), a Pro plan ($49/month) "
            "and a Premium plan ($99/month), and supports OpenAI models as "
            "well as open-source models like Llama 3, Mistral and Gemini, "
            "with tooling, templated prompts, zero-downtime versioning and "
            "training on your own data with RAG.\n\n"
            "If you would like, I can help you get started or point you to "
            "the right template for your use case.\n\n"
            "Best regards,\nThe Agentia Team"
        )
    if category == "customer_complaint":
        return (
            f"Dear {name},\n\nI am very sorry to hear about the trouble you "
            f"described regarding \"{subject}\" — I completely understand "
            "how frustrating this must be, and I apologise for the "
            "inconvenience.\n\n"
            "Your concern has been logged with our support team as a "
            "priority. We are looking into it right away and will follow up "
            "with you as soon as we have an update, including next steps on "
            "any billing correction if one is owed.\n\n"
            "Thank you for your patience, and please let us know if there is "
            "anything else we can help with in the meantime.\n\n"
            "Best regards,\nThe Agentia Team"
        )
    if category == "customer_feedback":
        return (
            f"Dear {name},\n\nThank you so much for taking the time to share "
            f"your feedback about \"{subject}\". Suggestions like yours are "
            "exactly how Agentia gets better, and we genuinely appreciate "
            "it.\n\n"
            "I have passed your idea on to our product team for "
            "consideration in an upcoming release. We will keep you posted "
            "if it ships.\n\n"
            "Best regards,\nThe Agentia Team"
        )
    return (
        f"Dear {name},\n\nThank you for your email. Could you share a little "
        "more detail about what you need help with so we can point you to "
        "the right person?\n\nBest regards,\nThe Agentia Team"
    )


def proofread(original_body: str, draft: str) -> dict:
    """Mock proofreader: the template drafts are always sendable."""
    if not draft.strip():
        return {
            "send": False,
            "feedback": "Mock proofreader: draft is empty, needs a rewrite.",
            "source": "mock",
        }
    return {
        "send": True,
        "feedback": (
            "Mock proofreader: draft is clear, professional, addresses the "
            "customer's request and matches the Agentia tone. Ready for "
            "human approval."
        ),
        "source": "mock",
    }


def mock_rag(query: str, k: int = 3) -> list[dict]:
    """Mock RAG: keyword retrieval over the KB, tagged source='mock'."""
    results = kb.retrieve(query, k=k)
    return [{"chunk": r["chunk"], "source": "mock"} for r in results]


SEED_EMAILS = [
    {
        "thread_id": "thread-pricing-001",
        "sender": "sarah.martin@example.com",
        "subject": "What are your pricing options?",
        "body": (
            "Hi Agentia team,\n\nWhat are your pricing options? How much does "
            "the Pro plan cost per month, and what is included in the Free "
            "plan? I run a small AI agency and I am comparing tools.\n\n"
            "Thanks,\nSarah"
        ),
        "minutes_ago": 180,
    },
    {
        "thread_id": "thread-features-002",
        "sender": "omar.benali@example.com",
        "subject": "Does Agentia support Llama 3 and voice calling?",
        "body": (
            "Hello,\n\nDoes Agentia support open-source models like Llama 3 "
            "and Mistral? And does it support voice calling via Bland.ai, "
            "plus bringing my own custom tools? I would like to know which "
            "features are available before I sign up.\n\nBest,\nOmar"
        ),
        "minutes_ago": 150,
    },
    {
        "thread_id": "thread-billing-003",
        "sender": "julie.dupont@example.com",
        "subject": "Charged twice this month - please refund",
        "body": (
            "Hi,\n\nI was charged twice this month for my Pro plan "
            "subscription ($49 twice). This billing error is unacceptable - "
            "please refund the duplicate charge as soon as possible.\n\n"
            "Julie"
        ),
        "minutes_ago": 120,
    },
    {
        "thread_id": "thread-downtime-004",
        "sender": "karim.haddad@example.com",
        "subject": "Platform is down - our agents are not working",
        "body": (
            "Hello support,\n\nThe Agentia platform is down right now and "
            "our agents are not working at all. This outage is affecting our "
            "clients and it is really frustrating. Please fix this urgently "
            "and let us know what happened.\n\nKarim"
        ),
        "minutes_ago": 95,
    },
    {
        "thread_id": "thread-feedback-005",
        "sender": "lena.fischer@example.com",
        "subject": "Suggestion: Slack integration and dark mode",
        "body": (
            "Hi team,\n\nI have a suggestion and some feedback: it would be "
            "great if Agentia had a Slack integration, and I would love a "
            "dark mode for the dashboard. Please add these features - I think "
            "they would improve the product a lot.\n\nThanks for listening,\nLena"
        ),
        "minutes_ago": 70,
    },
    {
        "thread_id": "thread-spam-006",
        "sender": "winner@crypto-lottery-xyz.com",
        "subject": "CONGRATULATIONS! You won a crypto prize!",
        "body": (
            "CONGRATULATIONS! You won a crypto lottery prize of 5 Bitcoin! "
            "Click here to claim your reward and double your money with this "
            "exclusive investment opportunity. Act now before it expires!"
        ),
        "minutes_ago": 45,
    },
    {
        "thread_id": "thread-rag-007",
        "sender": "youssef.elami@example.com",
        "subject": "How do I train my agent with my own data?",
        "body": (
            "Hi,\n\nHow do I train my agent with my own data using RAG? Can "
            "I upload my own datasets, and does Agentia support training "
            "with custom data on the Pro plan? Also, what templates are "
            "available to fast-track development?\n\nThanks,\nYoussef"
        ),
        "minutes_ago": 30,
    },
]


def seed_emails() -> int:
    """Seed the 7 mock inbox emails on first start (idempotent)."""
    with connect() as conn:
        count = conn.execute("SELECT COUNT(*) FROM emails").fetchone()[0]
        if count:
            return 0
        now = datetime.now(timezone.utc)
        for e in SEED_EMAILS:
            received = now - timedelta(minutes=e["minutes_ago"])
            snippet = " ".join(e["body"].split())[:140]
            conn.execute(
                """INSERT INTO emails(thread_id, sender, subject, snippet,
                       body, category, status, received_at, source)
                   VALUES (?, ?, ?, ?, ?, ?, 'new', ?, 'mock')""",
                (
                    e["thread_id"], e["sender"], e["subject"], snippet,
                    e["body"], categorize(e["body"] + " " + e["subject"]),
                    received.isoformat(),
                ),
            )
        return len(SEED_EMAILS)
