"""Schemas for the AI assistant placeholder endpoint."""

from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[str] = Field(default=None, max_length=100)


class ChatMessageResponse(BaseModel):
    reply: str
    timestamp: str = Field(default_factory=_utc_now)
