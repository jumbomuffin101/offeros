from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from app.models.base import ApplicationStatus
from app.schemas.application_event import EventType
from app.schemas.common import ORMModel


GmailConnectionStatus = Literal["connected", "syncing", "needs_reauthorization", "error", "disconnected"]
SuggestionStatus = Literal["pending", "accepted", "rejected", "dismissed", "expired"]


class GmailConnectResponse(ORMModel):
    authorization_url: str


class GmailStatusResponse(ORMModel):
    enabled: bool = False
    connected: bool = False
    gmail_address: str | None = None
    status: str = "disconnected"
    scope: str = "https://www.googleapis.com/auth/gmail.readonly"
    last_synced_at: datetime | None = None
    initial_sync_completed_at: datetime | None = None
    error_message: str | None = None
    sync_supported: bool = True


class GmailSyncResponse(ORMModel):
    status: str
    messages_scanned: int = 0
    candidates_found: int = 0
    suggestions_created: int = 0
    duplicates_skipped: int = 0
    last_synced_at: datetime | None = None


class GmailMessageSummary(ORMModel):
    sender_email: str
    sender_name: str | None
    subject: str
    snippet: str | None
    excerpt: str | None
    received_at: datetime


class GmailSuggestionResponse(ORMModel):
    id: UUID
    application_id: UUID | None
    accepted_event_id: UUID | None
    suggestion_type: str
    email_type: str
    suggested_status: str | None
    suggested_event_type: str | None
    suggested_event_at: datetime | None
    suggested_deadline_at: datetime | None
    source_timezone: str | None
    date_is_ambiguous: bool
    company_name: str | None
    role_title: str | None
    recruiter_name: str | None
    confidence: float
    evidence: list[str] = Field(default_factory=list)
    status: str
    reviewed_at: datetime | None
    note: str
    message: GmailMessageSummary
    created_at: datetime


class GmailSuggestionAcceptRequest(ORMModel):
    application_id: UUID
    event_type: EventType
    event_at: datetime
    deadline_at: datetime | None = None
    proposed_status: ApplicationStatus | None = None
    apply_status: bool = False
    recruiter_name: str | None = Field(default=None, max_length=200)
    note: str = Field(default="", max_length=2_000)


class GmailDisconnectRequest(ORMModel):
    delete_derived_data: bool = False


class GmailDeleteDataRequest(ORMModel):
    confirmation: Literal["DELETE GMAIL DATA"]
