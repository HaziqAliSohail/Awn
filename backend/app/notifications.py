"""Notifications: one source of truth (the notifications table), three surfaces.

  * in-app  — the row itself; the frontend renders it live over Realtime.
  * email   — sent from here over the project's Gmail SMTP.
  * web push — VAPID, to each of the recipient's subscribed devices.

Every delivery path is best-effort and isolated: a failing SMTP login or an
expired push endpoint is logged and swallowed, never surfaced to the member and
never allowed to break the request that triggered the notification. The in-app
row is written synchronously (so the badge lights up immediately); email and
push are handed to a FastAPI BackgroundTask so their latency is off the request
path.
"""

import html
import json
import logging

import httpx
from fastapi import BackgroundTasks

from .config import get_settings
from .db import service_delete, service_insert, service_select, service_select_one

logger = logging.getLogger("awn.notify")

# Where a notification should take the recipient. Offers/invites land on the
# need (to review and accept); accept/complete land on the open chat.
_PATH_BY_TYPE = {
    "offer": "sprint",
    "invite": "sprint",
    "accepted": "handshake",
    "completed": "handshake",
}


def _link(ntype: str, handshake_id: str | None, sprint_id: str | None) -> str:
    base = get_settings().app_base_url
    where = _PATH_BY_TYPE.get(ntype, "handshake")
    if where == "handshake" and handshake_id:
        return f"{base}/connections/{handshake_id}"
    if sprint_id:
        return f"{base}/sprints/{sprint_id}"
    return f"{base}/dashboard"


async def _recipient(user_id: str) -> dict:
    """Email + channel prefs for a recipient. Email comes from auth.users via
    the admin API (profiles don't store it); prefs from the profile."""
    s = get_settings()
    email = None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{s.supabase_url}/auth/v1/admin/users/{user_id}",
                headers={
                    "apikey": s.supabase_service_role_key,
                    "Authorization": f"Bearer {s.supabase_service_role_key}",
                },
            )
        if resp.status_code < 400:
            email = resp.json().get("email")
    except Exception as e:
        logger.warning("recipient email lookup failed for %s: %s", user_id, e)

    prof = await service_select_one(
        "profiles",
        params={"id": f"eq.{user_id}", "select": "notify_email,notify_push"},
    ) or {}
    return {
        "email": email,
        "notify_email": prof.get("notify_email", True),
        "notify_push": prof.get("notify_push", True),
    }


def _email_html(title: str, body: str | None, url: str) -> str:
    """Branded notification email — unified with the Awn magic-link template
    (same card, header, button, footer). Only the heading, body, button target,
    and footer copy differ by notification type."""
    safe_title = html.escape(title, quote=False)
    safe_body = (
        f'<p style="margin:0; font-size:15px; color:#64748b; line-height:1.6;">{html.escape(body, quote=False)}</p>'
        if body
        else ""
    )
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:24px; border:1px solid #e2e8f0; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 24px;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="width:40px; height:40px; background-color:#0d5c46; border-radius:12px; text-align:center; vertical-align:middle;">
                  <span style="font-size:18px; font-weight:bold; color:#ffffff;">ع</span>
                </td>
                <td style="padding-left:10px;">
                  <span style="font-size:20px; font-weight:bold; color:#0f172a; letter-spacing:-0.3px;">Awn</span>
                  <span style="font-size:13px; color:#94a3b8; margin-left:6px;">عَوْن</span>
                </td>
              </tr></table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:0 40px 16px;">
              <h2 style="margin:0 0 12px; font-size:20px; color:#0f172a; font-weight:700;">{safe_title}</h2>
              {safe_body}
            </td>
          </tr>
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding:16px 40px 32px;">
              <a href="{url}" style="display:inline-block; padding:14px 36px; background-color:#0d5c46; color:#ffffff; font-size:15px; font-weight:600; text-decoration:none; border-radius:12px; letter-spacing:0.3px;">
                Open Awn
              </a>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none; border-top:1px solid #e2e8f0; margin:0;">
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 40px 32px;">
              <p style="margin:0; font-size:12px; color:#94a3b8; line-height:1.5;">
                You're part of the Awn community — helping one another for the sake of Allah. Jazāk Allāhu khayran.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


async def _send_email(to: str, subject: str, html: str) -> None:
    """Dispatch to whichever transport is configured. Brevo (HTTPS) wins over
    SMTP because many hosts block outbound SMTP ports; SMTP stays as the
    local-dev fallback. Best-effort — failures are logged, never raised."""
    s = get_settings()
    if s.brevo_api_key:
        await _send_email_brevo(to, subject, html)
    elif s.smtp_user and s.smtp_password:
        await _send_email_smtp(to, subject, html)


async def _send_email_brevo(to: str, subject: str, html: str) -> None:
    s = get_settings()
    payload = {
        "sender": {"name": s.smtp_from_name or "Awn", "email": s.from_email},
        "to": [{"email": to}],
        "subject": subject,
        "htmlContent": html,
        "textContent": f"{subject}\n\nOpen Awn to see more.",
    }
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": s.brevo_api_key,
                    "content-type": "application/json",
                    "accept": "application/json",
                },
                json=payload,
            )
        if resp.status_code >= 400:
            logger.warning("brevo send to %s failed: %s %s", to, resp.status_code, resp.text[:300])
    except Exception as e:
        logger.warning("brevo send to %s errored: %s", to, e)


async def _send_email_smtp(to: str, subject: str, html: str) -> None:
    s = get_settings()
    import aiosmtplib
    from email.message import EmailMessage

    msg = EmailMessage()
    msg["From"] = f"{s.smtp_from_name} <{s.from_email}>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(f"{subject}\n\nOpen Awn to see more.")
    msg.add_alternative(html, subtype="html")
    try:
        # Port 465 = implicit TLS (use_tls); 587 would be STARTTLS.
        await aiosmtplib.send(
            msg,
            hostname=s.smtp_host,
            port=s.smtp_port,
            username=s.smtp_user,
            password=s.smtp_password,
            use_tls=s.smtp_port == 465,
            start_tls=s.smtp_port == 587,
            timeout=20,
        )
    except Exception as e:
        logger.warning("email send to %s failed: %s", to, e)


async def _send_push(user_id: str, payload: dict) -> None:
    s = get_settings()
    if not s.push_enabled:
        return
    from pywebpush import webpush, WebPushException

    subs = await service_select(
        "push_subscriptions",
        params={"user_id": f"eq.{user_id}", "select": "endpoint,p256dh,auth"},
    )
    data = json.dumps(payload)
    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub["endpoint"],
                    "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]},
                },
                data=data,
                vapid_private_key=s.vapid_private_key,
                vapid_claims={"sub": s.vapid_subject},
                timeout=15,
            )
        except WebPushException as e:
            status = getattr(e.response, "status_code", None)
            if status in (404, 410):
                # Endpoint is gone (uninstalled / expired) — prune it.
                try:
                    await service_delete(
                        "push_subscriptions",
                        params={"endpoint": f"eq.{sub['endpoint']}"},
                    )
                except Exception:
                    pass
            else:
                logger.warning("push to %s failed: %s", user_id, e)
        except Exception as e:
            logger.warning("push to %s errored: %s", user_id, e)


async def _deliver(user_id: str, title: str, body: str | None, url: str) -> None:
    """Off-request fan-out to email + push, gated by the recipient's prefs."""
    who = await _recipient(user_id)
    if who["notify_email"] and who["email"]:
        await _send_email(who["email"], title, _email_html(title, body, url))
    if who["notify_push"]:
        await _send_push(user_id, {"title": title, "body": body or "", "url": url})


async def notify(
    background: BackgroundTasks | None,
    *,
    user_id: str,
    ntype: str,
    title: str,
    body: str | None = None,
    handshake_id: str | None = None,
    sprint_id: str | None = None,
    actor_id: str | None = None,
) -> None:
    """Record a notification (synchronously, so the in-app badge is instant) and
    schedule email + push delivery in the background. Fully best-effort: any
    failure here is logged, never raised into the caller's request."""
    try:
        await service_insert(
            "notifications",
            {
                "user_id": user_id,
                "type": ntype,
                "title": title,
                "body": body,
                "handshake_id": handshake_id,
                "sprint_id": sprint_id,
                "actor_id": actor_id,
            },
        )
    except Exception as e:
        logger.error("could not record notification for %s: %s", user_id, e)
        return

    url = _link(ntype, handshake_id, sprint_id)
    if background is not None:
        background.add_task(_deliver, user_id, title, body, url)
    else:  # pragma: no cover - defensive
        await _deliver(user_id, title, body, url)
