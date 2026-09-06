import { redirect } from "next/navigation";
import Link from "next/link";
import { MessagesSquare, MailQuestion } from "lucide-react";
import { isAdminEmail } from "@/lib/auth";
import { requireProfile } from "@/lib/require-profile";
import { AppNav } from "@/components/app/AppNav";
import { CONNECTION_STATUS } from "@/lib/domains";
import { ConnectionActions } from "./connection-actions";

export const metadata = { title: "Connections" };

interface HandshakeRow {
  id: string;
  status: string;
  contributor_id: string;
  created_at: string;
  sprint: { id: string; title: string; creator_id: string } | null;
}

export default async function ConnectionsPage() {
  const { user, supabase } = await requireProfile();

  const sel = "id, status, contributor_id, created_at, sprint:sprints!inner(id, title, creator_id)";
  const [asHelper, asRequester] = await Promise.all([
    supabase.from("sprint_handshakes").select(sel).eq("contributor_id", user.id).order("created_at", { ascending: false }),
    supabase.from("sprint_handshakes").select(sel).eq("sprint.creator_id", user.id).order("created_at", { ascending: false }),
  ]);

  const rows = ([...(asHelper.data ?? []), ...(asRequester.data ?? [])] as unknown as HandshakeRow[])
    .filter((r) => r.sprint);

  // Resolve the "other person" names.
  const otherIds = Array.from(
    new Set(rows.map((r) => (r.contributor_id === user.id ? r.sprint!.creator_id : r.contributor_id)))
  );
  const { data: people } = otherIds.length
    ? await supabase.from("profiles").select("id, full_name, headline").in("id", otherIds)
    : { data: [] };
  const nameOf = new Map((people ?? []).map((p) => [p.id, p as { full_name: string; headline: string }]));

  return (
    <>
      <AppNav email={user.email ?? ""} isAdmin={isAdminEmail(user.email)} active="connections" />
      <main id="main" className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-surface-900">Connections</h1>
        <p className="mt-1 text-surface-500">Requests, offers, and your open chats.</p>

        {rows.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-surface-300 bg-white/60 p-12 text-center">
            <MailQuestion className="mx-auto h-8 w-8 text-surface-300" aria-hidden="true" />
            <p className="mt-3 font-semibold text-surface-700">No connections yet</p>
            <p className="mt-1 text-sm text-surface-500">Offer to help on a request, or ask for help and invite someone.</p>
          </div>
        ) : (
          <ul className="mt-8 space-y-3" role="list">
            {rows.map((r) => {
              const iAmHelper = r.contributor_id === user.id;
              const other = nameOf.get(iAmHelper ? r.sprint!.creator_id : r.contributor_id);
              const st = CONNECTION_STATUS[r.status] ?? CONNECTION_STATUS.matched;
              // You must respond when: helper + invited, OR requester + matched (offer).
              const canRespond = (iAmHelper && r.status === "invited") || (!iAmHelper && r.status === "matched");
              return (
                <li key={r.id} className="rounded-2xl border border-surface-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-surface-900">{other?.full_name ?? "A member"}</p>
                      <Link href={`/sprints/${r.sprint!.id}`} className="block truncate text-sm text-surface-500 hover:text-surface-800">
                        {r.sprint!.title}
                      </Link>
                      <span className={`mt-1.5 inline-block rounded border px-2 py-0.5 font-mono text-[0.65rem] uppercase ${st.className}`}>
                        {iAmHelper ? "You help" : "You asked"} · {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.status === "accepted" || r.status === "completed" ? (
                        <Link href={`/connections/${r.id}`} className="btn-primary text-sm">
                          <MessagesSquare className="h-4 w-4" aria-hidden="true" /> Chat
                        </Link>
                      ) : canRespond ? (
                        <ConnectionActions handshakeId={r.id} />
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
