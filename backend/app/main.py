"""Awn FastAPI application.

Auth model: the browser sends the Supabase access token as a bearer; endpoints
verify it and talk to Postgres under that identity so RLS stays in force.
Responses use a consistent { success, error } envelope to match the frontend.
"""

import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .routers import (
    admin,
    handshake,
    match,
    notifications,
    preview,
    profiles,
    sprints,
    trust,
)

logging.basicConfig(level=logging.INFO)


def _origins() -> list[str]:
    # Read CORS origins defensively so the app can still import if env is absent
    # (e.g. during unit tests that don't hit configured endpoints).
    try:
        from .config import get_settings

        return get_settings().origins_list
    except Exception:
        return ["*"]


app = FastAPI(title="Awn API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins(),
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=False,  # bearer tokens, not cookies
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": exc.detail},
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "error": "Validation failed",
            "details": jsonable_encoder(exc.errors()),
        },
    )


@app.get("/health")
async def health():
    return {"status": "ok"}


# Public
app.include_router(preview.router, tags=["public"])
# Authenticated
app.include_router(sprints.router, tags=["sprints"])
app.include_router(match.router, tags=["match"])
app.include_router(handshake.router, tags=["handshake"])
app.include_router(profiles.router, tags=["profiles"])
app.include_router(trust.router, tags=["trust"])
app.include_router(notifications.router, tags=["notifications"])
# Admin (concierge)
app.include_router(admin.router, tags=["admin"])
