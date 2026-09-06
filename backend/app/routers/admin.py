from fastapi import APIRouter, Depends

from ..db import service_update, service_upsert
from ..schemas import (
    AdminHandMatch,
    AdminResolveReport,
    AdminSprintStatus,
    AdminSuspend,
)
from ..security import CurrentUser, require_admin

router = APIRouter(prefix="/admin")


@router.post("/hand-match")
async def hand_match(body: AdminHandMatch, _: CurrentUser = Depends(require_admin)):
    """Concierge: create an accepted handshake on behalf of a contributor and
    move the sprint to 'claimed'. Service-role, gated by require_admin."""
    await service_upsert(
        "sprint_handshakes",
        {
            "sprint_id": body.sprintId,
            "contributor_id": body.contributorId,
            "waiver_acknowledged": True,
            "status": "accepted",
        },
        on_conflict="sprint_id,contributor_id",
    )
    await service_update(
        "sprints",
        params={"id": f"eq.{body.sprintId}"},
        patch={"status": "claimed"},
    )
    return {"success": True}


@router.post("/sprint-status")
async def set_sprint_status(
    body: AdminSprintStatus, _: CurrentUser = Depends(require_admin)
):
    await service_update(
        "sprints",
        params={"id": f"eq.{body.sprintId}"},
        patch={"status": body.status},
    )
    return {"success": True}


@router.post("/suspend")
async def suspend_member(body: AdminSuspend, _: CurrentUser = Depends(require_admin)):
    """Suspend or reinstate a member. A suspended member's needs drop out of the
    feed (enforced in the sprints SELECT policy) and their writes are refused."""
    await service_update(
        "profiles",
        params={"id": f"eq.{body.userId}"},
        patch={"suspended": body.suspended},
    )
    return {"success": True}


@router.post("/resolve-report")
async def resolve_report(
    body: AdminResolveReport, _: CurrentUser = Depends(require_admin)
):
    await service_update(
        "reports",
        params={"id": f"eq.{body.reportId}"},
        patch={"status": body.status},
    )
    return {"success": True}
