"""LangGraph workflow nodes (base code, adapted).

Changes vs the base:
- `Nodes` accepts injected emails (so the workflow can run over the
  seeded mock inbox or a Gmail fetch) and an optional `fallback` engine
  (the mock rule-based engine) used whenever a real LLM chain is
  unavailable — live mode degrades gracefully instead of crashing.
- `create_draft_response` ("send" node) NO LONGER creates a Gmail draft.
  Automail never sends anything without a human approving it first: the
  node only marks the draft as ready, and graph_runner persists it to
  the approval queue. A Gmail draft is created only when a human clicks
  Approve (see app/main.py).
- No colorama dependency (plain prints).
"""
from .agents import Agents
from .tools.GmailTools import GmailToolsClass
from .state import GraphState, Email


class Nodes:
    def __init__(self, agents=None, emails=None, fallback=None):
        self.agents = agents if agents is not None else Agents()
        self.gmail_tools = GmailToolsClass()
        # Injected inbox (list of dicts with Email fields). When None, the
        # node fetches unanswered emails from Gmail.
        self.injected_emails = emails
        # Fallback engine with categorize/retrieve/build_draft/proofread
        # (app.mock_engine in mock mode).
        self.fallback = fallback

    def load_new_emails(self, state: GraphState) -> GraphState:
        print("Loading new emails...\n")
        if self.injected_emails is not None:
            recent_emails = self.injected_emails
        else:
            recent_emails = self.gmail_tools.fetch_unanswered_emails()
        emails = [Email(**email) for email in recent_emails]
        return {"emails": emails}

    def check_new_emails(self, state: GraphState) -> str:
        if len(state['emails']) == 0:
            print("No new emails")
            return "empty"
        print("New emails to process")
        return "process"

    def is_email_inbox_empty(self, state: GraphState) -> GraphState:
        return state

    def categorize_email(self, state: GraphState) -> GraphState:
        print("Checking email category...\n")
        current_email = state["emails"][-1]
        if self.agents.categorize_email is not None:
            result = self.agents.categorize_email.invoke({"email": current_email.body})
            category = result.category.value
        elif self.fallback is not None:
            category = self.fallback.categorize(
                current_email.body + " " + current_email.subject)
        else:
            category = "product_enquiry"
        print(f"Email category: {category}")
        return {
            "email_category": category,
            "current_email": current_email
        }

    def route_email_based_on_category(self, state: GraphState) -> str:
        print("Routing email based on category...\n")
        category = state["email_category"]
        if category == "product_enquiry":
            return "product related"
        elif category == "unrelated":
            return "unrelated"
        else:
            return "not product related"

    def construct_rag_queries(self, state: GraphState) -> GraphState:
        print("Designing RAG query...\n")
        email_content = state["current_email"].body
        if self.agents.design_rag_queries is not None:
            query_result = self.agents.design_rag_queries.invoke({"email": email_content})
            queries = query_result.queries
        elif self.fallback is not None:
            # Subject first (it carries the intent), then the email body
            # itself — the first line is usually just a greeting and makes
            # a poor retrieval query.
            queries = [state["current_email"].subject,
                       email_content.strip()[:300]]
        else:
            queries = [email_content[:200]]
        return {"rag_queries": queries}

    def retrieve_from_rag(self, state: GraphState) -> GraphState:
        print("Retrieving information from internal knowledge...\n")
        final_answer = ""
        if self.agents.generate_rag_answer is not None:
            for query in state["rag_queries"]:
                rag_result = self.agents.generate_rag_answer.invoke(query)
                final_answer += query + "\n" + rag_result + "\n\n"
        elif self.fallback is not None:
            # Single combined retrieval over subject + body: per-query
            # concatenation put a tied first chunk (e.g. the model list)
            # ahead of the actually relevant one (e.g. pricing plans).
            query = (state["current_email"].subject + " "
                     + state["current_email"].body)
            hits = self.fallback.mock_rag(query, k=3)
            final_answer = "\n\n".join(h["chunk"] for h in hits)
        return {"retrieved_documents": final_answer}

    def write_draft_email(self, state: GraphState) -> GraphState:
        print("Writing draft email...\n")
        inputs = (
            f'# **EMAIL CATEGORY:** {state["email_category"]}\n\n'
            f'# **EMAIL CONTENT:**\n{state["current_email"].body}\n\n'
            f'# **INFORMATION:**\n{state["retrieved_documents"]}'
        )
        writer_messages = state.get('writer_messages', [])
        email = ""
        if self.agents.email_writer is not None:
            draft_result = self.agents.email_writer.invoke({
                "email_information": inputs,
                "history": writer_messages
            })
            email = draft_result.email
        if not email and self.fallback is not None:
            # Template draft, grounded in the retrieved documents.
            rag_context = [{"chunk": state["retrieved_documents"], "source": "mock"}] \
                if state.get("retrieved_documents") else []
            email = self.fallback.build_draft(
                state["email_category"], state["current_email"].sender,
                state["current_email"].subject, state["current_email"].body,
                rag_context)
        trials = state.get('trials', 0) + 1
        writer_messages.append(f"**Draft {trials}:**\n{email}")
        return {
            "generated_email": email,
            "trials": trials,
            "writer_messages": writer_messages
        }

    def verify_generated_email(self, state: GraphState) -> GraphState:
        print("Verifying generated email...\n")
        if self.agents.email_proofreader is not None:
            review = self.agents.email_proofreader.invoke({
                "initial_email": state["current_email"].body,
                "generated_email": state["generated_email"],
            })
            sendable, feedback = review.send, review.feedback
        elif self.fallback is not None:
            result = self.fallback.proofread(
                state["current_email"].body, state["generated_email"])
            sendable, feedback = result["send"], result["feedback"]
        else:
            sendable, feedback = True, "No proofreader available; assumed sendable."
        writer_messages = state.get('writer_messages', [])
        writer_messages.append(f"**Proofreader Feedback:**\n{feedback}")
        return {
            "sendable": sendable,
            "writer_messages": writer_messages
        }

    def must_rewrite(self, state: GraphState) -> str:
        email_sendable = state["sendable"]
        if email_sendable:
            print("Email is good, ready for the approval queue!")
            state["emails"].pop()
            state["writer_messages"] = []
            return "send"
        elif state["trials"] >= 3:
            print("Email is not good, we reached max trials must stop!")
            state["emails"].pop()
            state["writer_messages"] = []
            return "stop"
        else:
            print("Email is not good, must rewrite it...")
            return "rewrite"

    def create_draft_response(self, state: GraphState) -> GraphState:
        """Draft ready — queued for human approval, NOT sent to Gmail.

        Automail rule: nothing leaves the building without a human saying
        yes. Persistence to the approval queue happens in graph_runner;
        the Gmail draft itself is created only on Approve.
        """
        print("Draft ready for the human approval queue.\n")
        return {"retrieved_documents": "", "trials": 0}

    def send_email_response(self, state: GraphState) -> GraphState:
        # Not used by the Automail workflow (no auto-send). Kept for parity.
        print("Sending email...\n")
        self.gmail_tools.send_reply(state["current_email"], state["generated_email"])
        return {"retrieved_documents": "", "trials": 0}

    def skip_unrelated_email(self, state):
        print("Skipping unrelated email...\n")
        state["emails"].pop()
        return state
