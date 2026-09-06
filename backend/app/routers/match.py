from fastapi import APIRouter, Depends, HTTPException

from ..config import get_settings
from ..db import consume_rate_limit, service_rpc, service_select_one
from ..schemas import MatchRequest
from ..security import CurrentUser, get_current_user

router = APIRouter()


@router.post("/match-talent")
async def match_talent(body: MatchRequest, user: CurrentUser = Depends(get_current_user)):
    """AUTH: sprint owner (or admin) only. The embedding is loaded server-side
    (callers never supply vectors) and contact details are withheld."""
    if not await consume_rate_limit(f"match:{user.id}", 60, 86_400):
        raise HTTPException(status_code=429, detail="Matching limit reached for today.")

    sprint = await service_select_one(
        "sprints",
        params={
            "id": f"eq.{body.sprintId}",
            "select": "creator_id,embedding,required_gender,languages_needed,city,domain",
        },
    )
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    owns = sprint.get("creator_id") == user.id
    is_admin = (user.email or "").lower() in get_settings().admin_email_list
    if not owns and not is_admin:
        raise HTTPException(status_code=403, detail="Not permitted to match this sprint")

    if not sprint.get("embedding"):
        raise HTTPException(status_code=409, detail="Sprint has no embedding yet")

    rows = None
    try:
        rows = await service_rpc(
            "match_professionals",
            {
                "query_embedding": sprint["embedding"],
                "match_threshold": body.threshold if body.threshold is not None else 0.45,
                "match_count": body.limit if body.limit is not None else 5,
                "p_required_gender": sprint.get("required_gender"),
                "p_needed_languages": sprint.get("languages_needed") or [],
                "p_city": sprint.get("city"),
                "p_category": sprint.get("domain"),
                "p_requester_id": user.id,
            },
        )
    except HTTPException:
        # Fallback if PostgREST function signature resolution encounters operator conflicts
        import json
        from ..ai_service import generate_embedding, to_pgvector
        from ..db import _request, _rest_url, _service_headers, service_update

        s_vec = (
            json.loads(sprint["embedding"])
            if isinstance(sprint["embedding"], str)
            else sprint["embedding"]
        )
        profiles_res = await _request(
            "GET",
            _rest_url("profiles"),
            _service_headers(),
            params={
                "select": "id,full_name,headline,role_type,skills,hours_available_per_week,bio,gender,languages,city,embedding"
            },
        )
        profiles = profiles_res.json()
        threshold = body.threshold if body.threshold is not None else 0.45
        limit = body.limit if body.limit is not None else 5

        match_list = []
        for p in profiles:
            if p["id"] == user.id:
                continue
            # The RPC normally enforces this in SQL. Its fallback must retain
            # the same mutual-block guarantee, and fail closed on an RPC error.
            try:
                if await service_rpc("blocked_between", {"a": user.id, "b": p["id"]}) is True:
                    continue
            except HTTPException:
                continue
            if sprint.get("required_gender") and p.get("gender") != sprint["required_gender"]:
                continue

            p_vec = (
                json.loads(p["embedding"])
                if p.get("embedding") and isinstance(p["embedding"], str)
                else p.get("embedding")
            )
            if not p_vec:
                skills_str = " ".join(p.get("skills") or [])
                text = f"{p.get('full_name', '')} | {p.get('headline', '')} | {skills_str}"
                p_vec = await generate_embedding(text)
                await service_update(
                    "profiles",
                    params={"id": f"eq.{p['id']}"},
                    patch={"embedding": to_pgvector(p_vec)},
                )

            dot = sum(a * b for a, b in zip(s_vec, p_vec))
            norm_s = sum(a * a for a in s_vec) ** 0.5
            norm_p = sum(b * b for b in p_vec) ** 0.5
            sim = dot / (norm_s * norm_p) if (norm_s and norm_p) else 0.0

            if sim >= threshold:
                match_list.append(
                    {
                        "id": p["id"],
                        "full_name": p["full_name"],
                        "headline": p.get("headline", ""),
                        "skills": p.get("skills") or [],
                        "role_type": p["role_type"],
                        "hours_available_per_week": p.get("hours_available_per_week") or 10,
                        "similarity": sim,
                    }
                )

        match_list.sort(key=lambda x: x["similarity"], reverse=True)
        rows = match_list[:limit]

    candidates = [
        {
            "id": c["id"],
            "fullName": c["full_name"],
            "headline": c["headline"],
            "skills": c.get("skills") or [],
            "roleType": c["role_type"],
            "hoursAvailable": c["hours_available_per_week"],
            "similarity": round(c["similarity"] * 1000) / 1000,
            "hasDone": bool(c.get("has_done", False)),
            "vouchCount": int(c.get("vouch_count") or 0),
        }
        for c in (rows or [])
        if c["id"] != user.id
    ]
    return {"success": True, "candidates": candidates}
