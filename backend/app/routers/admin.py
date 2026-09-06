from fastapi import APIRouter, Depends

from ..db import service_update, service_upsert
from ..schemas import AdminHandMatch, AdminSprintStatus
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
