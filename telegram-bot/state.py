from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from api_client import BackendSession


@dataclass
class OutfitRequestState:
    style: str = "streetwear"
    occasion: str | None = None
    city: str | None = None
    budget_mode: str = "cheaper"
    budget_min: int | None = None
    budget_max: int | None = None
    luxury_only: bool = False


@dataclass
class ChatState:
    backend_session: BackendSession
    last_request: OutfitRequestState = field(default_factory=OutfitRequestState)
    last_outfit: dict[str, Any] | None = None


class BotStateStore:
    def __init__(self):
        self._store: dict[int, ChatState] = {}

    def set_chat_state(self, chat_id: int, state: ChatState) -> None:
        self._store[chat_id] = state

    def get_chat_state(self, chat_id: int) -> ChatState | None:
        return self._store.get(chat_id)

    def update_session(self, chat_id: int, session: BackendSession) -> None:
        if chat_id in self._store:
            self._store[chat_id].backend_session = session

    def update_request(self, chat_id: int, req: OutfitRequestState) -> None:
        if chat_id in self._store:
            self._store[chat_id].last_request = req

    def update_outfit(self, chat_id: int, outfit: dict[str, Any]) -> None:
        if chat_id in self._store:
            self._store[chat_id].last_outfit = outfit
