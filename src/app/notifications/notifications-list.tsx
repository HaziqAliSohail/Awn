"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  type AppNotification,
  NOTIFICATION_COLUMNS,
  notificationHref,
  timeAgo,
} from "@/lib/notifications";

/** Full history. Visiting the page marks everything read. */
export function NotificationsList() {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | null = null;

    supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.id;
      if (!active || !id) {
        if (active) setReady(true);
        return;
      }
      supabase
        .from("notifications")
        .select(NOTIFICATION_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(50)
        .then(({ data: rows }) => {
          if (!active) return;
          setItems((rows ?? []) as AppNotification[]);
          setReady(true);
          // Seeing the page counts as reading them.
          void supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
        });

      const channel = supabase
        .channel(`notifications-page:${id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${id}` },
          (payload) => {
            const n = payload.new as AppNotification;
            setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev]));
          }
        )
        .subscribe();
      cleanup = () => supabase.removeChannel(channel);
    });

    return () => {
      active = false;
      cleanup?.();
    };
  }, [supabase]);

  if (ready && items.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-dashed border-surface-300 bg-white/60 p-12 text-center">
        <Bell className="mx-auto h-8 w-8 text-surface-300" aria-hidden="true" />
        <p className="mt-3 font-semibold text-surface-700">No notifications yet</p>
        <p className="mt-1 text-sm text-surface-500">
          Offers, invitations, and updates from the community will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className="mt-6 divide-y divide-surface-100 overflow-hidden rounded-2xl border border-surface-200 bg-white" role="list">
      {items.map((n) => (
        <li key={n.id}>
          <Link href={notificationHref(n)} className="flex items-start gap-3 px-4 py-4 transition-colors hover:bg-surface-50">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-primary"}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-surface-900">{n.title}</p>
              {n.body ? <p className="mt-0.5 text-sm text-surface-500">{n.body}</p> : null}
            </div>
            <span className="shrink-0 font-mono text-[0.65rem] text-surface-400">{timeAgo(n.created_at)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
