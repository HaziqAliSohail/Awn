"""Screened, rate-limited chat messages for accepted connections."""

import re

from fastapi import APIRouter, Depends, HTTPException

from ..ai_service import screen_content
from ..db import consume_rate_limit, is_suspended, service_insert, service_rpc, service_select_one
from ..sanitizer import sanitize_raw_text
from ..schemas import ChatMessage
from ..security import CurrentUser, get_current_user

router = APIRouter()

# The model is the nuanced screen. These narrow patterns are a fail-closed
# backstop for unambiguous abuse or common payment scams if that dependency is
# unavailable. They intentionally do not match ordinary emotional language.
_CLEARLY_UNSAFE = re.compile(
    r"\b(?:kill yourself|i(?:'m| am) going to kill you|send (?:me )?(?:nudes|nude photos)|"
    r"underage (?:sex|girl|boy)|wire (?:me )?money|buy (?:me )?(?:a )?gift card|"
    r"(?:cash ?app|zelle|western union) (?:me|\$))\b",
    re.IGNORECASE,
)


async def _blocked_between(a: str, b: str) -> bool:
    """Fail closed: an unavailable block check must not open a private chat."""
    try:
        return await service_rpc("blocked_between", {"a": a, "b": b}) is True
    except HTTPException:
        return True


@router.post("/messages")
async def send_message(body: ChatMessage, user: CurrentUser = Depends(get_current_user)):
    """Persist a chat message only after server-side safety checks.

    The service role performs the final insert because the messages table has
    no client INSERT policy; authorization is checked here against the exact
    accepted handshake first.
    """
    if await is_suspended(user.id):
        raise HTTPException(status_code=403, detail="Your account is suspended.")
    if not await consume_rate_limit(f"message:{user.id}", 30, 60):
        raise HTTPException(status_code=429, detail="You're sending messages too quickly. Please wait a minute.")

    handshake = await service_select_one(
        "sprint_handshakes",
        params={
            "id": f"eq.{body.handshakeId}",
            "status": "eq.accepted",
            "select": "id,contributor_id,sprints!inner(creator_id)",
        },
    )
    if not handshake:
        raise HTTPException(status_code=404, detail="Connection not found or chat is closed.")

    sprint = handshake.get("sprints") or {}
    other_id = (
        sprint.get("creator_id")
        if handshake.get("contributor_id") == user.id
        else handshake.get("contributor_id")
    )
    if user.id not in (handshake.get("contributor_id"), sprint.get("creator_id")):
        raise HTTPException(status_code=403, detail="Not a participant in this connection.")
    if not other_id or await _blocked_between(user.id, other_id):
        raise HTTPException(status_code=404, detail="Connection not found or chat is unavailable.")

    clean_body = sanitize_raw_text(body.body.strip())
    if _CLEARLY_UNSAFE.search(clean_body):
        raise HTTPException(
            status_code=422,
            detail="This message can't be sent. Please keep messages safe and free of payment solicitation or abuse.",
        )
    verdict, _ = await screen_content(clean_body)
    if verdict != "ok":
        raise HTTPException(
            status_code=422,
            detail="This message can't be sent. Please reword it without harmful, abusive, or off-platform solicitation content.",
        )

    message = await service_insert(
        "messages",
        {"handshake_id": body.handshakeId, "sender_id": user.id, "body": clean_body},
    )
    return {"success": True, "data": message}
