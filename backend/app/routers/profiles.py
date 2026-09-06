import logging

from fastapi import APIRouter, Depends

from ..ai_service import generate_embedding, to_pgvector
from ..db import user_upsert
from ..schemas import ProfileInput
from ..security import CurrentUser, get_current_user

logger = logging.getLogger("awn.profiles")
router = APIRouter()


@router.put("/profile")
async def upsert_profile(body: ProfileInput, user: CurrentUser = Depends(get_current_user)):
    """AUTH: create/update the caller's profile (RLS enforces id = auth.uid()).
    Everyone can help, so everyone gets a semantic embedding built from what they
    can help with, what they've done before, their experience, skills, and languages."""
    row: dict = {
        "id": user.id,
        "full_name": body.fullName,
        "headline": body.headline,
        "role_type": body.roleType,
        "skills": body.skills,
        "linkedin_url": str(body.linkedinUrl) if body.linkedinUrl else None,
        "hours_available_per_week": body.hoursAvailable,
        "bio": body.bio,
        "gender": body.gender,
        "languages": body.languages,
        "city": body.city,
        "region": body.region,
        "can_help_with": body.canHelpWith,
        "have_helped_with": body.haveHelpedWith,
        "volunteer_experience": body.volunteerExperience,
    }

    try:
        categories = [c.replace("_", " ") for c in dict.fromkeys(body.canHelpWith + body.haveHelpedWith)]
        parts = [
            body.headline,
            *categories,
            *body.skills,
            *body.languages,
            body.volunteerExperience or "",
            body.bio or "",
        ]
        text = " | ".join(p.strip() for p in parts if p and p.strip())
        vec = await generate_embedding(text)
        row["embedding"] = to_pgvector(vec)
    except Exception as e:
        # Non-fatal — profile saves without a vector; they just won't surface in
        # matching until it's regenerated.
        logger.error("profile embedding failed: %s", e)

    await user_upsert("profiles", user.token, row, on_conflict="id")
    return {"success": True}
