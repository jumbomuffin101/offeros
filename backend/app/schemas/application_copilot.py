from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class ApplicationCopilotRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4_000)
    conversation_id: UUID | None = None


class ApplicationCopilotMessageResponse(ORMModel):
    id: UUID
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime


class ApplicationCopilotSendResponse(BaseModel):
    conversation_id: UUID
    message: ApplicationCopilotMessageResponse


class ApplicationCopilotConversationResponse(BaseModel):
    conversation_id: UUID | None = None
    messages: list[ApplicationCopilotMessageResponse] = Field(default_factory=list)
    context_sources: list[str] = Field(default_factory=list)
    has_more: bool = False
