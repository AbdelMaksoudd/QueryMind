"""AI assistant endpoint (placeholder until the LLM integration is wired in)."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter

from app.schemas.chat import ChatMessageRequest, ChatMessageResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["AI Chat Assistant"])


@router.post("", response_model=ChatMessageResponse)
def handle_chat_message(payload: ChatMessageRequest):
    logger.info(
        "Chat message received (conversation=%s): %s",
        payload.conversation_id or "-",
        payload.message,
    )
    return ChatMessageResponse(
        reply=(
            "This is a placeholder response from the AI. The real AI logic "
            "will be integrated here later."
        ),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
