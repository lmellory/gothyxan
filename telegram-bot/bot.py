from __future__ import annotations

import asyncio
import json
import logging
from html import escape
from typing import Any, Awaitable, Callable

from aiogram import Bot, Dispatcher, F, Router
from aiogram.filters import Command, CommandObject
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, InputMediaPhoto, Message

from api_client import BackendClient
from config import load_settings
from state import BotStateStore, ChatState, OutfitRequestState

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

router = Router()

settings = load_settings()
backend = BackendClient(settings)
store = BotStateStore()


def action_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🔁 Regenerate", callback_data="action:regenerate"),
                InlineKeyboardButton(text="❤️ Save", callback_data="action:save"),
            ],
            [
                InlineKeyboardButton(text="💰 Cheaper", callback_data="budget:cheaper"),
                InlineKeyboardButton(text="💎 Luxury", callback_data="budget:premium"),
            ],
            [InlineKeyboardButton(text="🛒 View Links", callback_data="action:links")],
        ]
    )


async def ensure_chat_session(message: Message) -> ChatState:
    chat_id = message.chat.id
    existing = store.get_chat_state(chat_id)
    if existing:
        return existing

    telegram_id = str(message.from_user.id if message.from_user else message.chat.id)
    username = message.from_user.username if message.from_user else None
    session = await backend.telegram_login(telegram_id=telegram_id, username=username)
    state = ChatState(backend_session=session)
    store.set_chat_state(chat_id, state)
    return state


async def call_with_refresh(
    chat_state: ChatState,
    fn: Callable[[str], Awaitable[dict[str, Any]]],
) -> dict[str, Any]:
    try:
        return await fn(chat_state.backend_session.access_token)
    except RuntimeError as error:
        error_text = str(error)
        if "401" not in error_text and "403" not in error_text:
            raise
        refreshed = await backend.refresh(chat_state.backend_session.refresh_token)
        chat_state.backend_session = refreshed
        return await fn(refreshed.access_token)


def format_outfit(outfit: dict[str, Any]) -> str:
    def line(label: str, data: dict[str, Any]) -> str:
        brand = escape(str(data.get("brand") or "Brand"))
        item = escape(str(data.get("item") or "Item"))
        price = data.get("price") or 0
        return f"<b>{label}</b>: {brand} — {item} (${price})"

    top = outfit.get("top", {})
    bottom = outfit.get("bottom", {})
    shoes = outfit.get("shoes", {})
    outerwear = outfit.get("outerwear", {})
    accessories = outfit.get("accessories", [])
    scores = outfit.get("scores") if isinstance(outfit.get("scores"), dict) else {}

    acc_lines: list[str] = []
    for acc in accessories[:3]:
        if not isinstance(acc, dict):
            continue
        brand = escape(str(acc.get("brand") or "Brand"))
        item = escape(str(acc.get("item") or "Item"))
        price = acc.get("price") or 0
        acc_lines.append(f"• {brand} — {item} (${price})")
    accessories_block = "\n".join(acc_lines) if acc_lines else "• none"

    score_line = (
        f"Style {scores.get('style_coherence', 0)}/100 | "
        f"Budget {scores.get('budget_efficiency', 0)}/100 | "
        f"Weather {scores.get('weather_compatibility', 0)}/100"
    )

    text = (
        "✨ <b>GOTHYXAN Outfit</b>\n"
        f"<b>Style</b>: {escape(str(outfit.get('style') or 'N/A'))}\n"
        f"<b>Weather</b>: {escape(str(outfit.get('weather_context') or 'N/A'))}\n"
        f"<b>Budget</b>: {escape(str(outfit.get('budget_range') or 'N/A'))}\n\n"
        f"{line('Top', top)}\n"
        f"{line('Bottom', bottom)}\n"
        f"{line('Outerwear', outerwear)}\n"
        f"{line('Shoes', shoes)}\n"
        f"<b>Accessories</b>:\n{accessories_block}\n\n"
        f"<b>Total</b>: ${outfit.get('total_price')}\n"
        f"<b>Scores</b>: {escape(score_line)}\n"
        f"<b>Why it works</b>: {escape(str(outfit.get('explanation') or 'Balanced branded outfit'))}"
    )

    if len(text) > 3900:
        return text[:3890] + "..."
    return text


def collect_outfit_photos(outfit: dict[str, Any]) -> list[tuple[str, str, str]]:
    slots: list[tuple[str, dict[str, Any]]] = [
        ("Top", outfit.get("top", {})),
        ("Bottom", outfit.get("bottom", {})),
        ("Outerwear", outfit.get("outerwear", {})),
        ("Shoes", outfit.get("shoes", {})),
    ]
    accessories = outfit.get("accessories", [])
    if isinstance(accessories, list):
        for index, item in enumerate(accessories[:2], start=1):
            if isinstance(item, dict):
                slots.append((f"Accessory {index}", item))

    photos: list[tuple[str, str, str]] = []
    for label, data in slots:
        image = data.get("image") if isinstance(data.get("image"), dict) else {}
        image_url = image.get("high_res") or image.get("medium") or data.get("image_url")
        if not isinstance(image_url, str) or not image_url.startswith(("http://", "https://")):
            continue

        brand = data.get("brand") or "Brand"
        item = data.get("item") or "Item"
        price = data.get("price") or 0
        caption = f"<b>{escape(label.upper())}</b>\n{escape(str(brand))} — {escape(str(item))}\n${price}"
        photos.append((image_url, caption, label))

    return photos[:6]


async def send_outfit_photos(message: Message, outfit: dict[str, Any]) -> None:
    photos = collect_outfit_photos(outfit)
    if not photos:
        return

    media_group: list[InputMediaPhoto] = []
    for index, (url, caption, _label) in enumerate(photos):
        media_group.append(
            InputMediaPhoto(
                media=url,
                caption=caption if index == 0 else None,
                parse_mode="HTML" if index == 0 else None,
            )
        )

    for attempt in range(3):
        try:
            await message.answer_media_group(media=media_group)
            return
        except Exception as error:
            logger.warning("Failed to send outfit photo group (attempt %s): %s", attempt + 1, error)
            await asyncio.sleep(0.4 + attempt * 0.4)

    first_url, first_caption, _ = photos[0]
    fallback_url = f"{settings.backend_url}/api/media/placeholder?variant=medium"
    for source_url in [first_url, fallback_url]:
        try:
            await message.answer_photo(photo=source_url, caption=first_caption, parse_mode="HTML")
            return
        except Exception as inner_error:
            logger.warning("Failed to send fallback outfit photo: %s", inner_error)


def collect_outfit_links(outfit: dict[str, Any]) -> list[str]:
    slots: list[tuple[str, dict[str, Any]]] = [
        ("Top", outfit.get("top", {})),
        ("Bottom", outfit.get("bottom", {})),
        ("Outerwear", outfit.get("outerwear", {})),
        ("Shoes", outfit.get("shoes", {})),
    ]

    accessories = outfit.get("accessories", [])
    if isinstance(accessories, list):
        for index, item in enumerate(accessories[:3], start=1):
            if isinstance(item, dict):
                slots.append((f"Accessory {index}", item))

    lines: list[str] = []
    for label, data in slots:
        link = data.get("affiliate_link") or data.get("reference_link")
        if not isinstance(link, str) or not link.startswith(("http://", "https://")):
            continue
        brand = escape(str(data.get("brand") or "Brand"))
        item = escape(str(data.get("item") or "Item"))
        lines.append(f"• <b>{escape(label)}</b>: <a href=\"{escape(link)}\">{brand} — {item}</a>")
    return lines


async def generate_and_send(message: Message, req: OutfitRequestState) -> None:
    chat_state = await ensure_chat_session(message)
    chat_state.last_request = req

    async def _generate(access_token: str) -> dict[str, Any]:
        return await backend.generate_outfit(
            access_token=access_token,
            style=req.style,
            occasion=req.occasion,
            city=req.city,
            budget_mode=req.budget_mode,
            budget_min=req.budget_min,
            budget_max=req.budget_max,
            luxury_only=req.luxury_only,
        )

    outfit = await call_with_refresh(chat_state, _generate)
    chat_state.last_outfit = outfit

    await message.answer(
        format_outfit(outfit),
        reply_markup=action_keyboard(),
        parse_mode="HTML",
        disable_web_page_preview=True,
    )
    await send_outfit_photos(message, outfit)


@router.message(Command("start"))
async def on_start(message: Message) -> None:
    await ensure_chat_session(message)
    await message.answer(
        "GOTHYXAN premium bot ready.\n"
        "Commands:\n"
        "/setstyle <style>\n"
        "/setoccasion <occasion>\n"
        "/setcity <city>\n"
        "/budget cheaper|premium|custom <min> <max>\n"
        "/luxury on|off\n"
        "/generate\n"
        "/state",
    )


@router.message(Command("setstyle"))
async def on_set_style(message: Message, command: CommandObject) -> None:
    state = await ensure_chat_session(message)
    if not command.args:
        await message.answer("Usage: /setstyle streetwear")
        return
    state.last_request.style = command.args.strip().lower()
    await message.answer(f"Style set to: {state.last_request.style}")


@router.message(Command("setoccasion"))
async def on_set_occasion(message: Message, command: CommandObject) -> None:
    state = await ensure_chat_session(message)
    if not command.args:
        await message.answer("Usage: /setoccasion date")
        return
    state.last_request.occasion = command.args.strip().lower()
    await message.answer(f"Occasion set to: {state.last_request.occasion}")


@router.message(Command("setcity"))
async def on_set_city(message: Message, command: CommandObject) -> None:
    state = await ensure_chat_session(message)
    if not command.args:
        await message.answer("Usage: /setcity London")
        return
    state.last_request.city = command.args.strip()
    await message.answer(f"City set to: {state.last_request.city}")


@router.message(Command("budget"))
async def on_budget(message: Message, command: CommandObject) -> None:
    state = await ensure_chat_session(message)
    if not command.args:
        await message.answer("Usage: /budget cheaper OR /budget premium OR /budget custom 200 900")
        return

    parts = command.args.split()
    mode = parts[0].strip().lower()
    if mode not in {"cheaper", "premium", "custom"}:
        await message.answer("Budget mode must be: cheaper, premium or custom")
        return

    state.last_request.budget_mode = mode
    if mode == "custom":
        if len(parts) < 3:
            await message.answer("Usage for custom: /budget custom 200 900")
            return
        try:
            state.last_request.budget_min = int(parts[1])
            state.last_request.budget_max = int(parts[2])
        except ValueError:
            await message.answer("Budget values must be numbers")
            return
    else:
        state.last_request.budget_min = None
        state.last_request.budget_max = None
        state.last_request.luxury_only = mode == "premium"

    await message.answer(
        f"Budget set: {mode} {state.last_request.budget_min or ''} {state.last_request.budget_max or ''}".strip()
    )


@router.message(Command("luxury"))
async def on_luxury(message: Message, command: CommandObject) -> None:
    state = await ensure_chat_session(message)
    mode = (command.args or "").strip().lower()
    if mode not in {"on", "off"}:
        await message.answer("Usage: /luxury on or /luxury off")
        return

    state.last_request.luxury_only = mode == "on"
    if state.last_request.luxury_only:
        state.last_request.budget_mode = "premium"
    await message.answer(f"Luxury mode: {'enabled' if state.last_request.luxury_only else 'disabled'}")


@router.message(Command("state"))
async def on_state(message: Message) -> None:
    state = await ensure_chat_session(message)
    await message.answer(
        "Current request:\n"
        + json.dumps(
            {
                "style": state.last_request.style,
                "occasion": state.last_request.occasion,
                "city": state.last_request.city,
                "budget_mode": state.last_request.budget_mode,
                "budget_min": state.last_request.budget_min,
                "budget_max": state.last_request.budget_max,
                "luxury_only": state.last_request.luxury_only,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


@router.message(Command("generate"))
async def on_generate(message: Message) -> None:
    state = await ensure_chat_session(message)
    await generate_and_send(message, state.last_request)


@router.callback_query(F.data.startswith("budget:"))
async def on_budget_action(callback: CallbackQuery) -> None:
    if not callback.message:
        return
    chat_state = await ensure_chat_session(callback.message)
    action = callback.data.split(":", maxsplit=1)[1]

    req = chat_state.last_request
    if action == "cheaper":
        if req.budget_mode == "custom":
            req.budget_min = max(50, int((req.budget_min or 200) * 0.7))
            req.budget_max = max(req.budget_min + 50, int((req.budget_max or 900) * 0.75))
            req.luxury_only = False
        else:
            req.budget_mode = "cheaper"
            req.budget_min = None
            req.budget_max = None
            req.luxury_only = False
    elif action == "premium":
        if req.budget_mode == "custom":
            req.budget_min = int((req.budget_min or 200) * 1.2)
            req.budget_max = int((req.budget_max or 900) * 1.3)
            req.luxury_only = True
        else:
            req.budget_mode = "premium"
            req.budget_min = None
            req.budget_max = None
            req.luxury_only = True

    await callback.answer("Regenerating...")
    await generate_and_send(callback.message, req)


@router.callback_query(F.data == "action:regenerate")
async def on_regenerate(callback: CallbackQuery) -> None:
    if not callback.message:
        return
    chat_state = await ensure_chat_session(callback.message)
    await callback.answer("Regenerating...")
    await generate_and_send(callback.message, chat_state.last_request)


@router.callback_query(F.data == "action:save")
async def on_save(callback: CallbackQuery) -> None:
    if not callback.message:
        return
    chat_state = await ensure_chat_session(callback.message)
    if not chat_state.last_outfit:
        await callback.answer("No outfit to save", show_alert=True)
        return

    async def _save(access_token: str) -> dict[str, Any]:
        return await backend.save_outfit(access_token, chat_state.last_outfit or {})

    await call_with_refresh(chat_state, _save)
    await callback.answer("Outfit saved")


@router.callback_query(F.data == "action:links")
async def on_links(callback: CallbackQuery) -> None:
    if not callback.message:
        return
    chat_state = await ensure_chat_session(callback.message)
    outfit = chat_state.last_outfit
    if not outfit:
        await callback.answer("No outfit yet", show_alert=True)
        return

    links = collect_outfit_links(outfit)
    if not links:
        await callback.answer("No links available", show_alert=True)
        return

    text = "<b>🛒 Buy Links</b>\n\n" + "\n".join(links[:8])
    await callback.message.answer(text, parse_mode="HTML", disable_web_page_preview=True)
    await callback.answer("Links sent")


@router.message()
async def on_plain_message(message: Message) -> None:
    # Quick mode: a plain style name triggers generation with current context.
    style = (message.text or "").strip().lower()
    if not style:
        return

    state = await ensure_chat_session(message)
    state.last_request.style = style
    await generate_and_send(message, state.last_request)


async def main() -> None:
    bot = Bot(token=settings.bot_token)
    dispatcher = Dispatcher()
    dispatcher.include_router(router)

    try:
        await dispatcher.start_polling(bot)
    finally:
        await backend.close()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
