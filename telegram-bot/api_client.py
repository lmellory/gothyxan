from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import aiohttp

from config import Settings


@dataclass
class BackendSession:
    access_token: str
    refresh_token: str
    token_type: str


class BackendClient:
    def __init__(self, settings: Settings):
        self.base_url = f"{settings.backend_url}/api"
        self.timeout = aiohttp.ClientTimeout(total=settings.backend_timeout_seconds)
        self.bot_secret = settings.bot_secret
        self._session: aiohttp.ClientSession | None = None

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(timeout=self.timeout)
        return self._session

    async def telegram_login(self, telegram_id: str, username: str | None) -> BackendSession:
        payload: dict[str, Any] = {
            "telegramId": telegram_id,
            "username": username,
        }
        if self.bot_secret:
            payload["botSecret"] = self.bot_secret

        data = await self._request("POST", "/auth/telegram/login", json=payload)
        return BackendSession(
            access_token=data["accessToken"],
            refresh_token=data["refreshToken"],
            token_type=data.get("tokenType", "Bearer"),
        )

    async def refresh(self, refresh_token: str) -> BackendSession:
        data = await self._request("POST", "/auth/refresh", json={"refreshToken": refresh_token})
        return BackendSession(
            access_token=data["accessToken"],
            refresh_token=data["refreshToken"],
            token_type=data.get("tokenType", "Bearer"),
        )

    async def generate_outfit(
        self,
        access_token: str,
        *,
        style: str,
        occasion: str | None,
        city: str | None,
        budget_mode: str,
        budget_min: int | None = None,
        budget_max: int | None = None,
        luxury_only: bool = False,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "style": style,
            "budgetMode": budget_mode,
            "luxuryOnly": luxury_only,
        }
        if occasion:
            payload["occasion"] = occasion
        if city:
            payload["city"] = city
        if budget_mode == "custom":
            if budget_min is not None:
                payload["budgetMin"] = budget_min
            if budget_max is not None:
                payload["budgetMax"] = budget_max

        return await self._request(
            "POST",
            "/outfits/generate",
            json=payload,
            access_token=access_token,
        )

    async def save_outfit(self, access_token: str, outfit: dict[str, Any]) -> dict[str, Any]:
        return await self._request(
            "POST",
            "/outfits/save",
            json={
                "channel": "TELEGRAM",
                "outfit": outfit,
            },
            access_token=access_token,
        )

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        access_token: str | None = None,
    ) -> dict[str, Any]:
        headers = {"Content-Type": "application/json"}
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"

        session = await self._get_session()

        async with session.request(
            method=method,
            url=f"{self.base_url}{path}",
            headers=headers,
            json=json,
        ) as response:
            text = await response.text()
            if response.status >= 400:
                raise RuntimeError(f"Backend {response.status}: {text}")
            if not text:
                return {}
            return await response.json()
