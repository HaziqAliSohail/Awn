"""Trust & safety: peer vouching, reporting, and blocking.

All three run on the community itself — no moderator role is required for
any of it. Vouching is gated to members who have actually connected, so a
vouch reflects a real interaction and can't be farmed. Reports flow to a
single app-wide admin queue (see routers/admin.py); blocks are mutual and
enforced in the sprints SELECT policy at the database layer.
"""

from fastapi import APIRouter, Depends, HTTPException

from ..db import (
    consume_rate_limit,
    service_select_one,
    user_delete,
    user_insert,
)
from ..schemas import BlockInput, ReportInput, UnvouchInput, VouchInput
from ..security import CurrentUser, get_current_user

router = APIRouter()


async def _have_connected(a: str, b: str) -> bool:
    """True if a and b are the two parties of an accepted/completed connection
    (one asked, the other helped). Read with the service role since neither
    party's JWT can see a handshake unless they're on it — which is exactly
    what we're verifying."""
    # a as the helper, b as the requester.
    as_helper = await service_select_one(
        "sprint_handshakes",
        params={
            "contributor_id": f"eq.{a}",
            "status": "in.(accepted,completed)",
            "sprints.creator_id": f"eq.{b}",
            "select": "id,sprints!inner(creator_id)",
        },
    )
    if as_helper:
        return True
    # a as the requester, b as the helper.
    as_requester = await service_select_one(
        "sprint_handshakes",
        params={
            "contributor_id": f"eq.{b}",
            "status": "in.(accepted,completed)",
            "sprints.creator_id": f"eq.{a}",
            "select": "id,sprints!inner(creator_id)",
        },
    )
    return bool(as_requester)


@router.post("/vouch")
async def vouch(body: VouchInput, user: CurrentUser = Depends(get_current_user)):
    """Vouch for someone you've helped or been helped by."""
    if body.voucheeId == user.id:
        raise HTTPException(status_code=400, detail="You can't vouch for yourself")
    if not await consume_rate_limit(f"vouch:{user.id}", 30, 86_400):
        raise HTTPException(status_code=429, detail="Vouch limit reached for today.")
    if not await _have_connected(user.id, body.voucheeId):
        raise HTTPException(
            status_code=403,
            detail="You can only vouch for someone you've connected with.",
        )
    try:
        await user_insert(
            "vouches",
            user.token,
            {"voucher_id": user.id, "vouchee_id": body.voucheeId, "note": body.note},
        )
    except HTTPException as e:
        if e.status_code == 409:
            return {"success": True}  # already vouched — idempotent
        raise
    return {"success": True}


@router.delete("/vouch")
async def unvouch(body: UnvouchInput, user: CurrentUser = Depends(get_current_user)):
    await user_delete(
        "vouches",
        user.token,
        params={"voucher_id": f"eq.{user.id}", "vouchee_id": f"eq.{body.voucheeId}"},
    )
    return {"success": True}


@router.post("/report")
async def report(body: ReportInput, user: CurrentUser = Depends(get_current_user)):
    """Flag a member and/or a need for the admin queue."""
    if body.reportedUserId == user.id:
        raise HTTPException(status_code=400, detail="You can't report yourself")
    if not await consume_rate_limit(f"report:{user.id}", 20, 86_400):
        raise HTTPException(status_code=429, detail="Report limit reached for today.")
    await user_insert(
        "reports",
        user.token,
        {
            "reporter_id": user.id,
            "reported_user_id": body.reportedUserId,
            "sprint_id": body.sprintId,
            "reason": body.reason,
            "detail": body.detail,
        },
    )
    return {"success": True}


@router.post("/block")
async def block(body: BlockInput, user: CurrentUser = Depends(get_current_user)):
    """Hide a member from yourself, mutually. Nothing is surfaced to them."""
    if body.blockedId == user.id:
        raise HTTPException(status_code=400, detail="You can't block yourself")
    try:
        await user_insert(
            "blocks",
            user.token,
            {"blocker_id": user.id, "blocked_id": body.blockedId},
        )
    except HTTPException as e:
        if e.status_code == 409:
            return {"success": True}  # already blocked — idempotent
        raise
    return {"success": True}


@router.delete("/block")
async def unblock(body: BlockInput, user: CurrentUser = Depends(get_current_user)):
    await user_delete(
        "blocks",
        user.token,
        params={"blocker_id": f"eq.{user.id}", "blocked_id": f"eq.{body.blockedId}"},
    )
    return {"success": True}
