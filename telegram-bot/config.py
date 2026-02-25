from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    bot_token: str
    backend_url: str
    backend_timeout_seconds: int
    bot_secret: str | None


def load_settings() -> Settings:
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    backend_url = os.getenv("TELEGRAM_BACKEND_URL", "http://localhost:4000").strip().rstrip("/")
    timeout_raw = os.getenv("TELEGRAM_BACKEND_TIMEOUT", "10").strip()
    bot_secret = os.getenv("TELEGRAM_BACKEND_BOT_SECRET", "").strip() or None

    if not bot_token:
        raise ValueError("TELEGRAM_BOT_TOKEN is required")

    return Settings(
        bot_token=bot_token,
        backend_url=backend_url,
        backend_timeout_seconds=int(timeout_raw),
        bot_secret=bot_secret,
    )
