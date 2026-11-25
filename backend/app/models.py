"""Pydantic request/response models for the Mailroom API."""
from typing import List, Optional

from pydantic import BaseModel, Field


class DraftEdit(BaseModel):
    body: str


class DraftApprove(BaseModel):
    note: Optional[str] = None
    decided_by: Optional[str] = "human"


class DraftReject(BaseModel):
    reason: Optional[str] = ""
    note: Optional[str] = None
    decided_by: Optional[str] = "human"


class EmailOut(BaseModel):
    id: int
    thread_id: Optional[str] = None
    sender: Optional[str] = None
    subject: Optional[str] = None
    snippet: Optional[str] = None
    body: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    received_at: Optional[str] = None
    has_draft: bool = False


class RagChunk(BaseModel):
    chunk: str
    source: str


class DraftOut(BaseModel):
    id: int
    email_id: Optional[int] = None
    sender: Optional[str] = None
    subject: Optional[str] = None
    category: Optional[str] = None
    body: Optional[str] = None
    proofreader_feedback: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[str] = None
    decided_by: Optional[str] = None
    decision_note: Optional[str] = None


class RunStepOut(BaseModel):
    seq: int
    node: str
    detail: str = ""
    status: str = ""


class KbDocOut(BaseModel):
    id: int
    name: str
    chunks: int
    created_at: Optional[str] = None


class KbUploadOut(BaseModel):
    id: int
    name: str
    chunks: int


class RunOut(BaseModel):
    run_id: int
    status: str


class HealthOut(BaseModel):
    status: str = "ok"
    mode: str
    provider: str
    model: str
    gmail_connected: bool
    demo: bool


class StatsOut(BaseModel):
    total_emails: int
    by_category: dict = Field(default_factory=dict)
    pending_drafts: int
    approved: int
    rejected: int
    approval_rate: float
    avg_first_response_min: Optional[float] = None
