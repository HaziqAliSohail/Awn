from fastapi import APIRouter, HTTPException, Request

from ..db import consume_rate_limit
from ..ai_service import scope_sprint
from ..sanitizer import sanitize_raw_text
from ..schemas import IntakeRequest

router = APIRouter()


def client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.headers.get("x-real-ip") or (
        request.client.host if request.client else "unknown"
    )


@router.post("/preview-sprint")
async def preview_sprint(body: IntakeRequest, request: Request):
    """PUBLIC: instant AI preview, no persistence, strict per-IP rate limit."""
    ip = client_ip(request)
    if not await consume_rate_limit(f"preview:{ip}", 8, 3_600):
        raise HTTPException(
            status_code=429,
            detail="You've reached the free preview limit. Sign in to keep scoping sprints.",
        )

    sanitized = sanitize_raw_text(body.rawText)
    scoped = await scope_sprint(sanitized, body.orgName)

    return {"success": True, "preview": True, "data": {**scoped.model_dump(), "id": None}}
