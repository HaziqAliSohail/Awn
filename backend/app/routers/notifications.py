"""Push-subscription management.

In-app notifications and marking them read happen directly against Supabase
under RLS from the browser (the notifications table). The backend only needs to
own the device push subscriptions, which it later reads (service role) to send.
"""

from fastapi import APIRouter, Depends

from ..db import service_delete, user_delete, user_insert
from ..schemas import PushSubscribe, PushUnsubscribe
from ..security import CurrentUser, get_current_user

router = APIRouter()


@router.post("/push/subscribe")
async def subscribe(body: PushSubscribe, user: CurrentUser = Depends(get_current_user)):
    """Register (or re-register) this device for web push. The endpoint uniquely
    identifies the device, so we clear any prior mapping for it first — that way
    a shared device follows whoever last enabled push."""
    await service_delete("push_subscriptions", params={"endpoint": f"eq.{body.endpoint}"})
    await user_insert(
        "push_subscriptions",
        user.token,
        {
            "user_id": user.id,
            "endpoint": body.endpoint,
            "p256dh": body.keys.p256dh,
            "auth": body.keys.auth,
        },
    )
    return {"success": True}


@router.post("/push/unsubscribe")
async def unsubscribe(body: PushUnsubscribe, user: CurrentUser = Depends(get_current_user)):
    await user_delete(
        "push_subscriptions",
        user.token,
        params={"endpoint": f"eq.{body.endpoint}", "user_id": f"eq.{user.id}"},
    )
    return {"success": True}
