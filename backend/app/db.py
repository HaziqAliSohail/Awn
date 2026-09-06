"""Thin async Supabase (PostgREST + RPC) access layer.

Two identities:
  * `user_*`   — calls made with the caller's JWT + anon apikey, so Postgres
                 RLS policies apply exactly as for the frontend.
  * `service_*`— calls made with the service-role key; RLS is bypassed, so
                 these are only used behind explicit authorization checks.
"""

from typing import Any

import httpx
from fastapi import HTTPException

from .config import get_settings

_TIMEOUT = httpx.Timeout(20.0)


def _rest_url(path: str) -> str:
    return f"{get_settings().supabase_url}/rest/v1/{path}"


def _rpc_url(fn: str) -> str:
    return f"{get_settings().supabase_url}/rest/v1/rpc/{fn}"


def _user_headers(token: str) -> dict[str, str]:
    s = get_settings()
    return {
        "apikey": s.supabase_anon_key,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def _service_headers() -> dict[str, str]:
    s = get_settings()
    return {
        "apikey": s.supabase_service_role_key,
        "Authorization": f"Bearer {s.supabase_service_role_key}",
        "Content-Type": "application/json",
    }


async def _request(
    method: str,
    url: str,
    headers: dict[str, str],
    *,
    params: dict[str, Any] | None = None,
    json: Any = None,
) -> httpx.Response:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        return await client.request(method, url, headers=headers, params=params, json=json)


def _raise_for_status(resp: httpx.Response, context: str) -> None:
    if resp.status_code >= 400:
        # Surface the PostgREST error code for callers that special-case it
        # (e.g. unique_violation), but never leak the body to end users.
        raise HTTPException(status_code=502, detail=f"{context}: db error")


# ── user-scoped (RLS enforced) ────────────────────────────────────────────

async def user_insert(table: str, token: str, row: dict[str, Any]) -> dict[str, Any]:
    headers = {**_user_headers(token), "Prefer": "return=representation"}
    resp = await _request("POST", _rest_url(table), headers, json=row)
    if resp.status_code == 409:
        raise HTTPException(status_code=409, detail="conflict")
    _raise_for_status(resp, f"insert {table}")
    data = resp.json()
    return data[0] if isinstance(data, list) and data else data


async def user_upsert(table: str, token: str, row: dict[str, Any], on_conflict: str) -> None:
    headers = {
        **_user_headers(token),
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    resp = await _request(
        "POST", _rest_url(table), headers, params={"on_conflict": on_conflict}, json=row
    )
    _raise_for_status(resp, f"upsert {table}")


async def user_select_one(
    table: str, token: str, *, params: dict[str, Any]
) -> dict[str, Any] | None:
    headers = {**_user_headers(token), "Accept": "application/json"}
    resp = await _request("GET", _rest_url(table), headers, params=params)
    _raise_for_status(resp, f"select {table}")
    rows = resp.json()
    return rows[0] if rows else None


async def user_update(
    table: str, token: str, *, params: dict[str, Any], patch: dict[str, Any]
) -> None:
    headers = {**_user_headers(token), "Prefer": "return=minimal"}
    resp = await _request("PATCH", _rest_url(table), headers, params=params, json=patch)
    _raise_for_status(resp, f"update {table}")


# ── service-scoped (RLS bypassed — guard every caller) ─────────────────────

async def service_select_one(
    table: str, *, params: dict[str, Any]
) -> dict[str, Any] | None:
    resp = await _request("GET", _rest_url(table), _service_headers(), params=params)
    _raise_for_status(resp, f"select {table}")
    rows = resp.json()
    return rows[0] if rows else None


async def service_insert(table: str, row: dict[str, Any]) -> dict[str, Any]:
    headers = {**_service_headers(), "Prefer": "return=representation"}
    resp = await _request("POST", _rest_url(table), headers, json=row)
    if resp.status_code == 409:
        raise HTTPException(status_code=409, detail="conflict")
    _raise_for_status(resp, f"insert {table}")
    data = resp.json()
    return data[0] if isinstance(data, list) and data else data


async def service_update(table: str, *, params: dict[str, Any], patch: dict[str, Any]) -> None:
    headers = {**_service_headers(), "Prefer": "return=minimal"}
    resp = await _request("PATCH", _rest_url(table), headers, params=params, json=patch)
    _raise_for_status(resp, f"update {table}")


async def service_upsert(table: str, row: dict[str, Any], on_conflict: str) -> None:
    headers = {**_service_headers(), "Prefer": "resolution=merge-duplicates,return=minimal"}
    resp = await _request(
        "POST", _rest_url(table), headers, params={"on_conflict": on_conflict}, json=row
    )
    _raise_for_status(resp, f"upsert {table}")


async def service_rpc(fn: str, payload: dict[str, Any]) -> Any:
    resp = await _request("POST", _rpc_url(fn), _service_headers(), json=payload)
    _raise_for_status(resp, f"rpc {fn}")
    return resp.json()


# ── rate limiting (durable, via migration 008) ─────────────────────────────

async def consume_rate_limit(key: str, limit: int, window_seconds: int) -> bool:
    """Returns True if the action is allowed. Fails open on infra error."""
    try:
        result = await service_rpc(
            "consume_rate_limit",
            {"p_key": key, "p_limit": limit, "p_window_seconds": window_seconds},
        )
        return result is True
    except HTTPException:
        return True
