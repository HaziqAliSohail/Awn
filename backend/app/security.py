"""Supabase JWT verification and auth dependencies.

The browser sends the Supabase access token as `Authorization: Bearer <jwt>`.

Newer Supabase projects sign tokens with **ES256** (asymmetric ECDSA).  We fetch
the project's JWKS and verify against the published public key.  Older projects
that still use HS256 are supported as a fallback via the SUPABASE_JWT_SECRET env
var.
"""

import logging
from dataclasses import dataclass
from functools import lru_cache

import httpx
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import get_settings

logger = logging.getLogger("awn.security")
_bearer = HTTPBearer(auto_error=False)


@dataclass
class CurrentUser:
    id: str
    email: str | None
    token: str


def _unauthorized(detail: str = "Not authenticated") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


@lru_cache
def _jwks_client() -> PyJWKClient | None:
    """Build a cached JWKS client pointing at the Supabase auth endpoint."""
    settings = get_settings()
    jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    try:
        # Quick smoke-test that the URL is reachable
        resp = httpx.get(jwks_url, timeout=5)
        resp.raise_for_status()
        logger.info("JWKS endpoint reachable: %s", jwks_url)
        return PyJWKClient(jwks_url)
    except Exception as e:
        logger.warning("JWKS endpoint unavailable (%s), will fall back to HS256", e)
        return None


def _decode_token(token: str) -> dict:
    """Decode a Supabase JWT, trying ES256 (JWKS) first, then HS256."""
    settings = get_settings()

    # --- Attempt 1: ES256 via JWKS ---
    client = _jwks_client()
    if client is not None:
        try:
            signing_key = client.get_signing_key_from_jwt(token)
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256"],
                audience="authenticated",
                options={"require": ["sub"]},
            )
        except jwt.PyJWTError as e:
            logger.debug("ES256 decode failed (%s), trying HS256 fallback", e)

    # --- Attempt 2: HS256 with the legacy symmetric secret ---
    return jwt.decode(
        token,
        settings.supabase_jwt_secret,
        algorithms=["HS256"],
        audience="authenticated",
        options={"require": ["sub"]},
    )


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> CurrentUser:
    if creds is None or not creds.credentials:
        raise _unauthorized()

    token = creds.credentials
    try:
        payload = _decode_token(token)
    except jwt.PyJWTError:
        raise _unauthorized("Invalid or expired token")

    sub = payload.get("sub")
    if not sub:
        raise _unauthorized("Token missing subject")

    return CurrentUser(id=sub, email=payload.get("email"), token=token)


async def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    settings = get_settings()
    if (user.email or "").lower() not in settings.admin_email_list:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return user

