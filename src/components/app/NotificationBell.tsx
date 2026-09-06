"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellRing, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import {
  type AppNotification,
  NOTIFICATION_COLUMNS,
  notificationHref,
  timeAgo,
} from "@/lib/notifications";
import { enablePush, pushPermission } from "@/lib/push";

/**
 * Bell + unread badge + dropdown for the top nav. Notifications are written by
 * the backend and arrive here live over Supabase Realtime (RLS-scoped to the
 * viewer). Opening the panel marks everything read. Also the home for the
 * "turn on push" prompt, shown only when the browser supports it and hasn't
 * been granted yet.
 */
export function NotificationBell() {
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const [meId, setMeId] = useState<string | null>(null);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [pushState, setPushState] = useState<NotificationPermission | "unsupported">("unsupported");
  const [enabling, setEnabling] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    setPushState(pushPermission());
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.id ?? null;
      if (!active) return;
      setMeId(id);
      if (!id) return;

      supabase
        .from("notifications")
        .select(NOTIFICATION_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(15)
        .then(({ data: rows }) => {
          if (active && rows) setItems(rows as AppNotification[]);
        });

      const channel = supabase
        .channel(`notifications:${id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${id}` },
          (payload) => {
            const n = payload.new as AppNotification;
            setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev].slice(0, 30)));
          }
        )
        .subscribe();

      // Stash the channel for cleanup.
      cleanupRef.current = () => supabase.removeChannel(channel);
    });

    return () => {
      active = false;
      cleanupRef.current?.();
    };
  }, [supabase]);

  async function markAllRead() {
    if (!meId || unread === 0) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await supabase.from("notifications").update({ read_at: now }).is("read_at", null);
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) void markAllRead();
  }

  async function onEnablePush() {
    setEnabling(true);
    const result = await enablePush();
    setEnabling(false);
    setPushState(pushPermission());
    if (result === "enabled") {
      toast({ variant: "success", title: "Push notifications on", description: "We'll reach you even when Awn is closed." });
    } else if (result === "denied") {
      toast({ variant: "error", title: "Notifications blocked", description: "Allow them in your browser settings to enable push." });
    } else if (result === "error") {
      toast({ variant: "error", title: "Couldn't enable push", description: "Please try again." });
    }
  }

  if (!meId) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={toggle}
        className="relative rounded-lg p-2 text-surface-600 transition-colors hover:bg-surface-100 hover:text-surface-900"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
      >
        {unread > 0 ? <BellRing className="h-5 w-5" aria-hidden="true" /> : <Bell className="h-5 w-5" aria-hidden="true" />}
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[0.6rem] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-glass-lg">
            <div className="flex items-center justify-between border-b border-surface-100 px-4 py-3">
              <span className="text-sm font-semibold text-surface-900">Notifications</span>
              <Link href="/notifications" onClick={() => setOpen(false)} className="text-xs text-brand-700 hover:underline">
                See all
              </Link>
            </div>

            {pushState !== "granted" && pushState !== "unsupported" ? (
              <button
                onClick={onEnablePush}
                disabled={enabling}
                className="flex w-full items-center gap-2 border-b border-surface-100 bg-brand-50/60 px-4 py-2.5 text-left text-xs font-medium text-brand-800 hover:bg-brand-50 disabled:opacity-60"
              >
                <BellRing className="h-4 w-4 shrink-0" aria-hidden="true" />
                {enabling ? "Enabling…" : "Turn on push notifications for this device"}
              </button>
            ) : null}

            <ul className="max-h-[22rem] divide-y divide-surface-100 overflow-y-auto" role="list">
              {items.length === 0 ? (
                <li className="px-4 py-10 text-center text-sm text-surface-400">
                  Nothing yet. You&apos;ll hear from the ummah here.
                </li>
              ) : (
                items.slice(0, 15).map((n) => (
                  <li key={n.id}>
                    <Link
                      href={notificationHref(n)}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 transition-colors hover:bg-surface-50"
                    >
                      <div className="flex items-start gap-2">
                        {!n.read_at ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" /> : <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden="true" />}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-surface-900">{n.title}</p>
                          {n.body ? <p className="mt-0.5 text-xs text-surface-500">{n.body}</p> : null}
                          <p className="mt-1 font-mono text-[0.65rem] text-surface-400">{timeAgo(n.created_at)}</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))
              )}
            </ul>

            {unread > 0 ? (
              <button
                onClick={markAllRead}
                className="flex w-full items-center justify-center gap-1.5 border-t border-surface-100 px-4 py-2.5 text-xs font-medium text-surface-600 hover:bg-surface-50"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" /> Mark all read
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
