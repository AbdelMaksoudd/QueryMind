from datetime import datetime
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/chat", tags=["AI Chat Assistant"])


class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User's query or message to the library assistant")
    conversation_id: Optional[str] = Field(None, description="Optional conversation session ID")


class ChatMessageResponse(BaseModel):
    reply: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


@router.post("", response_model=ChatMessageResponse)
def handle_chat_message(payload: ChatMessageRequest):
    """
    PLACEHOLDER AI CHAT ENDPOINT.
    
    CRITICAL NOTE:
    As per design constraints, this endpoint does NOT run any LLM/LangChain logic.
    It prints the incoming user message to the terminal and returns a static mock response.
    
    -------------------------------------------------------------------------
    FUTURE INTEGRATION SPOT:
    To plug in your custom AI system (`client.py` and `ToolManager.py`):
    
        # from app.ai.client import MyAIClient
        # from app.ai.ToolManager import ToolManager
        # ai_client = MyAIClient(...)
        # ai_response = ai_client.generate_response(payload.message)
    -------------------------------------------------------------------------
    """
    # 1. Print incoming message to the server terminal
    print("\n" + "=" * 60)
    print(f"🤖 [AI CHAT RECEIVED] Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print(f"💬 User Message: {payload.message}")
    if payload.conversation_id:
        print(f"🆔 Conversation ID: {payload.conversation_id}")
    print("=" * 60 + "\n")

    # 2. Return mock placeholder string
    mock_reply = "This is a placeholder response from the AI. The real AI logic will be integrated here later."

    return ChatMessageResponse(
        reply=mock_reply,
        timestamp=datetime.utcnow().isoformat()
    )

