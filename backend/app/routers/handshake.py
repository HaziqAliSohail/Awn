from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from ..db import (
    consume_rate_limit,
    is_suspended,
    service_insert,
    service_rpc,
    service_select_one,
    user_insert,
    user_select_one,
    user_update,
)
from ..notifications import notify
from ..schemas import HandshakeClaim, HandshakeUpdate, RequestHelp
from ..security import CurrentUser, get_current_user

router = APIRouter()

# Symmetric connection state machine. A connection opens from either side and
# both are consent-gated; chat unlocks once 'accepted'.
_ALLOWED_TRANSITIONS: dict[str, list[str]] = {
    "invited": ["accepted", "rejected"],   # helper decides
    "matched": ["accepted", "rejected"],   # requester decides
    "accepted": ["completed"],             # either decides
    "rejected": [],
    "completed": [],
}


async def _blocked_between(a: str, b: str) -> bool:
    """True if either member has blocked the other (mutual invisibility)."""
    try:
        return await service_rpc("blocked_between", {"a": a, "b": b}) is True
    except HTTPException:
        return False  # never let an infra hiccup falsely block a connection


@router.post("/handshake")
async def claim_sprint(
    body: HandshakeClaim,
    background: BackgroundTasks,
    user: CurrentUser = Depends(get_current_user),
):
    """Path A: a helper offers to help on an open need (→ 'matched')."""
    if await is_suspended(user.id):
        raise HTTPException(status_code=403, detail="Your account is suspended.")
    if not await consume_rate_limit(f"claim:{user.id}", 40, 86_400):
        raise HTTPException(status_code=429, detail="Claim limit reached for today.")

    owner = await service_select_one(
        "sprints", params={"id": f"eq.{body.sprintId}", "select": "creator_id,title"}
    )
    if owner and await _blocked_between(user.id, owner["creator_id"]):
        raise HTTPException(status_code=404, detail="Need not found")

    try:
        created = await user_insert(
            "sprint_handshakes",
            user.token,
            {
                "sprint_id": body.sprintId,
                "contributor_id": user.id,
                "waiver_acknowledged": True,
                "status": "matched",
                "intro_note": body.note,
            },
        )
    except HTTPException as e:
        if e.status_code == 409:
            raise HTTPException(status_code=409, detail="You've already offered on this")
        raise

    # Notify the requester. The helper stays anonymous until they accept, so the
    # message names the need, not the person.
    if owner:
        await notify(
            background,
            user_id=owner["creator_id"],
            ntype="offer",
            title="Someone offered to help",
            body=f"You have a new offer on ‘{owner.get('title', 'your request')}’. Open it to review and accept.",
            handshake_id=created["id"],
            sprint_id=body.sprintId,
            actor_id=user.id,
        )
    return {"success": True, "data": {"id": created["id"]}}


@router.post("/request-help")
async def request_help(
    body: RequestHelp,
    background: BackgroundTasks,
    user: CurrentUser = Depends(get_current_user),
):
    """Path B: the requester invites a specific helper they picked (→ 'invited').
    Runs service-side after verifying the caller owns the need (RLS would
    otherwise block inserting a row for someone else's contributor_id)."""
    if await is_suspended(user.id):
        raise HTTPException(status_code=403, detail="Your account is suspended.")
    if not await consume_rate_limit(f"invite:{user.id}", 40, 86_400):
        raise HTTPException(status_code=429, detail="Request limit reached for today.")

    if body.contributorId == user.id:
        raise HTTPException(status_code=400, detail="You can't request help from yourself")
    if await _blocked_between(user.id, body.contributorId):
        raise HTTPException(status_code=404, detail="Helper not available")

    sprint = await service_select_one(
        "sprints", params={"id": f"eq.{body.sprintId}", "select": "creator_id,title"}
    )
    if not sprint:
        raise HTTPException(status_code=404, detail="Need not found")
    if sprint.get("creator_id") != user.id:
        raise HTTPException(status_code=403, detail="You can only invite helpers to your own need")

    existing = await service_select_one(
        "sprint_handshakes",
        params={
            "sprint_id": f"eq.{body.sprintId}",
            "contributor_id": f"eq.{body.contributorId}",
            "select": "id",
        },
    )
    if existing:
        raise HTTPException(status_code=409, detail="You've already requested this helper")

    created = await service_insert(
        "sprint_handshakes",
        {
            "sprint_id": body.sprintId,
            "contributor_id": body.contributorId,
            "waiver_acknowledged": True,
            "status": "invited",
            "intro_note": body.note,
        },
    )

    await notify(
        background,
        user_id=body.contributorId,
        ntype="invite",
        title="You've been asked to help",
        body=f"A member asked for your help with ‘{sprint.get('title', 'a request')}’. Open it to respond.",
        handshake_id=created["id"],
        sprint_id=body.sprintId,
        actor_id=user.id,
    )
    return {"success": True, "data": {"id": created["id"]}}


@router.patch("/handshake")
async def respond_handshake(
    body: HandshakeUpdate,
    background: BackgroundTasks,
    user: CurrentUser = Depends(get_current_user),
):
    """Advance the connection. Who may act depends on how it started:
    an 'invited' helper decides; a 'matched' requester decides; the requester
    confirms completion of an 'accepted' connection."""
    hs = await user_select_one(
        "sprint_handshakes",
        user.token,
        params={"id": f"eq.{body.handshakeId}", "select": "status,contributor_id,sprint_id"},
    )
    if not hs:
        raise HTTPException(status_code=404, detail="Connection not found or not permitted")

    from_status: str = hs["status"]
    if body.status not in _ALLOWED_TRANSITIONS.get(from_status, []):
        raise HTTPException(
            status_code=422,
            detail=f"Cannot move connection from {from_status} to {body.status}",
        )

    sprint = await user_select_one(
        "sprints",
        user.token,
        params={"id": f"eq.{hs['sprint_id']}", "select": "creator_id,title"},
    )
    creator_id = sprint.get("creator_id") if sprint else None
    need_title = (sprint or {}).get("title", "a request")
    contributor_id = hs["contributor_id"]

    if from_status == "invited" and user.id != contributor_id:
        raise HTTPException(status_code=403, detail="Only the invited helper can respond")
    if from_status == "matched" and user.id != creator_id:
        raise HTTPException(status_code=403, detail="Only the requester can respond")
    if from_status == "accepted" and user.id not in (contributor_id, creator_id):
        raise HTTPException(status_code=403, detail="Not a participant")

    # Completion is confirmed by the person who received the help (the
    # requester), so a helper can't close it prematurely. No deliverable/proof
    # is expected — most help (janāzah, a ride, a meal) has no artifact.
    if body.status == "completed" and user.id != creator_id:
        raise HTTPException(
            status_code=403,
            detail="Only the requester can mark the help completed.",
        )

    await user_update(
        "sprint_handshakes",
        user.token,
        params={"id": f"eq.{body.handshakeId}"},
        patch={"status": body.status},
    )

    # Marking the connection completed also closes the underlying need, so it
    # leaves the open feed and can't take new offers.
    if body.status == "completed":
        await user_update(
            "sprints",
            user.token,
            params={"id": f"eq.{hs['sprint_id']}"},
            patch={"status": "completed"},
        )

    # Notify the counterparty of the outcome.
    if body.status == "accepted":
        recipient = creator_id if user.id == contributor_id else contributor_id
        if recipient:
            await notify(
                background,
                user_id=recipient,
                ntype="accepted",
                title="You're connected",
                body=f"Your connection on ‘{need_title}’ was accepted. Open the chat to coordinate.",
                handshake_id=body.handshakeId,
                sprint_id=hs["sprint_id"],
                actor_id=user.id,
            )
    elif body.status == "completed" and contributor_id:
        # The requester confirmed; thank the helper.
        await notify(
            background,
            user_id=contributor_id,
            ntype="completed",
            title="Your help was marked complete",
            body=f"‘{need_title}’ was marked completed. Jazāk Allāhu khayran for stepping forward.",
            handshake_id=body.handshakeId,
            sprint_id=hs["sprint_id"],
            actor_id=user.id,
        )

    return {"success": True}
