"""LLM agents (base code, adapted).

Changes vs the base:
- Construction is lazy and guarded: if GROQ_API_KEY / GOOGLE_API_KEY are
  missing, the LLM chains are None instead of raising at import time.
  `available` reports whether the real LLM chains exist.
- Embeddings / Chroma are only built when GOOGLE_API_KEY is set; otherwise
  the RAG chain is None and callers fall back to the keyword retriever
  (app/kb.py), so RAG still works with no keys.
- Model is llama-3.3-70b-versatile (Groq) as in the base.
"""
import os

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder, PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

from .structure_outputs import (
    CategorizeEmailOutput, ProofReaderOutput, RAGQueriesOutput, WriterOutput,
)
from .prompts import (
    CATEGORIZE_EMAIL_PROMPT, EMAIL_PROOFREADER_PROMPT, EMAIL_WRITER_PROMPT,
    GENERATE_RAG_ANSWER_PROMPT, GENERATE_RAG_QUERIES_PROMPT,
)


class Agents:
    def __init__(self, chroma_dir="db"):
        self.available = False
        self.categorize_email = None
        self.design_rag_queries = None
        self.generate_rag_answer = None
        self.email_writer = None
        self.email_proofreader = None
        groq_key = os.environ.get("GROQ_API_KEY", "").strip()
        google_key = os.environ.get("GOOGLE_API_KEY", "").strip()
        if not groq_key:
            print("[agents] GROQ_API_KEY not set — LLM agents unavailable (mock mode).")
            return
        try:
            from langchain_groq import ChatGroq
            llama = ChatGroq(model_name="llama-3.3-70b-versatile", temperature=0.1)

            email_category_prompt = PromptTemplate(
                template=CATEGORIZE_EMAIL_PROMPT, input_variables=["email"])
            self.categorize_email = (
                email_category_prompt | llama.with_structured_output(CategorizeEmailOutput)
            )

            generate_query_prompt = PromptTemplate(
                template=GENERATE_RAG_QUERIES_PROMPT, input_variables=["email"])
            self.design_rag_queries = (
                generate_query_prompt | llama.with_structured_output(RAGQueriesOutput)
            )

            writer_prompt = ChatPromptTemplate.from_messages([
                ("system", EMAIL_WRITER_PROMPT),
                MessagesPlaceholder("history"),
                ("human", "{email_information}"),
            ])
            self.email_writer = writer_prompt | llama.with_structured_output(WriterOutput)

            proofreader_prompt = PromptTemplate(
                template=EMAIL_PROOFREADER_PROMPT,
                input_variables=["initial_email", "generated_email"])
            self.email_proofreader = (
                proofreader_prompt | llama.with_structured_output(ProofReaderOutput)
            )

            # RAG chain: Chroma + Gemini embeddings when a Google key exists.
            if google_key and os.path.isdir(chroma_dir):
                from langchain_google_genai import GoogleGenerativeAIEmbeddings
                from langchain_chroma import Chroma
                embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
                vectorstore = Chroma(persist_directory=chroma_dir,
                                     embedding_function=embeddings)
                retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
                qa_prompt = ChatPromptTemplate.from_template(GENERATE_RAG_ANSWER_PROMPT)
                self.generate_rag_answer = (
                    {"context": retriever, "question": RunnablePassthrough()}
                    | qa_prompt | llama | StrOutputParser()
                )
            else:
                print("[agents] no Gemini key / no Chroma store — "
                      "RAG falls back to the local keyword retriever.")
            self.available = True
        except Exception as e:
            print(f"[agents] failed to initialise LLM agents: {e}")
            self.available = False
