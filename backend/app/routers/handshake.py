from fastapi import APIRouter, Depends, HTTPException

from ..db import (
    consume_rate_limit,
    service_insert,
    service_select_one,
    user_insert,
    user_select_one,
    user_update,
)
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


@router.post("/handshake")
async def claim_sprint(body: HandshakeClaim, user: CurrentUser = Depends(get_current_user)):
    """Path A: a helper offers to help on an open need (→ 'matched')."""
    if not await consume_rate_limit(f"claim:{user.id}", 40, 86_400):
        raise HTTPException(status_code=429, detail="Claim limit reached for today.")
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
    return {"success": True, "data": {"id": created["id"]}}


@router.post("/request-help")
async def request_help(body: RequestHelp, user: CurrentUser = Depends(get_current_user)):
    """Path B: the requester invites a specific helper they picked (→ 'invited').
    Runs service-side after verifying the caller owns the need (RLS would
    otherwise block inserting a row for someone else's contributor_id)."""
    if not await consume_rate_limit(f"invite:{user.id}", 40, 86_400):
        raise HTTPException(status_code=429, detail="Request limit reached for today.")

    if body.contributorId == user.id:
        raise HTTPException(status_code=400, detail="You can't request help from yourself")

    sprint = await service_select_one(
        "sprints", params={"id": f"eq.{body.sprintId}", "select": "creator_id"}
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
    return {"success": True, "data": {"id": created["id"]}}


@router.patch("/handshake")
async def respond_handshake(body: HandshakeUpdate, user: CurrentUser = Depends(get_current_user)):
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
        params={"id": f"eq.{hs['sprint_id']}", "select": "creator_id"},
    )
    creator_id = sprint.get("creator_id") if sprint else None
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

    return {"success": True}
