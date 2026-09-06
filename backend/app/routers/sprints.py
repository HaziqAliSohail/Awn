import logging

from fastapi import APIRouter, Depends, HTTPException

from ..db import consume_rate_limit, is_suspended, user_insert, user_select_one
from ..ai_service import (
    build_embedding_input,
    generate_embedding,
    scope_sprint,
    screen_content,
    to_pgvector,
)
from ..sanitizer import sanitize_raw_text
from ..schemas import IntakeRequest
from ..security import CurrentUser, get_current_user

logger = logging.getLogger("awn.sprints")
router = APIRouter()


@router.post("/scope-sprint")
async def scope_sprint_endpoint(
    body: IntakeRequest, user: CurrentUser = Depends(get_current_user)
):
    """AUTH: sanitize → scope → embed → persist a sprint owned by the caller.
    Insert runs under the user's JWT so RLS enforces creator_id = auth.uid()."""
    if await is_suspended(user.id):
        raise HTTPException(status_code=403, detail="Your account is suspended.")

    if not await consume_rate_limit(f"scope:{user.id}", 15, 86_400):
        raise HTTPException(
            status_code=429,
            detail="Daily scoping limit reached. Please try again tomorrow.",
        )

    sanitized = sanitize_raw_text(body.rawText)

    # Automated safety screen before anything is persisted. Fails open, so a
    # model outage never blocks legitimate help; only clear abuse is refused,
    # while borderline posts are created and flagged for the admin queue.
    verdict, screen_reason = await screen_content(sanitized)
    if verdict == "reject":
        raise HTTPException(
            status_code=422,
            detail="This request can't be posted. If you think that's a mistake, please reword it or reach out to us.",
        )
    flagged = verdict == "review"

    is_org = body.requesterKind == "organization"
    if is_org:
        requester_label = body.orgName or "Community organization"
    else:
        # Use the member's own name so the scoped title reads naturally.
        prof = await user_select_one(
            "profiles", user.token, params={"id": f"eq.{user.id}", "select": "full_name"}
        )
        requester_label = (prof or {}).get("full_name") or "A community member"

    scoped = await scope_sprint(sanitized, requester_label)

    embedding: str | None = None
    try:
        vec = await generate_embedding(build_embedding_input(scoped))
        embedding = to_pgvector(vec)
    except Exception as e:  # non-fatal — sprint is still usable without matching
        logger.error("sprint embedding failed: %s", e)

    created = await user_insert(
        "sprints",
        user.token,
        {
            "creator_id": user.id,
            "requester_kind": body.requesterKind,
            "org_name": body.orgName if is_org else None,
            "org_type": body.orgType if is_org else None,
            "raw_input": sanitized,
            "title": scoped.title,
            "domain": scoped.domain,
            "deliverables": scoped.deliverables,
            "prerequisites": scoped.prerequisites,
            "estimated_hours": scoped.estimatedHours,
            "status": "open",
            "embedding": embedding,
            "timing": body.timing,
            "needed_by": body.neededBy,
            "in_person": body.inPerson,
            "required_gender": body.requiredGender,
            "languages_needed": body.languagesNeeded,
            "city": body.city,
            "flagged": flagged,
            "flag_reason": screen_reason if flagged else None,
        },
    )

    return {
        "success": True,
        "data": {
            "id": created["id"],
            **scoped.model_dump(),
            "embeddingStored": embedding is not None,
        },
    }
