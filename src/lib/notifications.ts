// Shared shape + routing for in-app notifications (written by the backend,
// read live by the browser over Supabase Realtime).

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  handshake_id: string | null;
  sprint_id: string | null;
  read_at: string | null;
  created_at: string;
}

export const NOTIFICATION_COLUMNS =
  "id, type, title, body, handshake_id, sprint_id, read_at, created_at";

/** Where a notification takes you: offers/invites to the need, accept/complete to the chat. */
export function notificationHref(n: AppNotification): string {
  if ((n.type === "accepted" || n.type === "completed") && n.handshake_id) {
    return `/connections/${n.handshake_id}`;
  }
  if (n.sprint_id) return `/sprints/${n.sprint_id}`;
  if (n.handshake_id) return `/connections/${n.handshake_id}`;
  return "/dashboard";
}

export function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
