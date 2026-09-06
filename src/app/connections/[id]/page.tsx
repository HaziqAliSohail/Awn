import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getUser, isAdminEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app/AppNav";
import { Chat } from "./chat";
import { CompletePanel } from "./complete-panel";
import { MemberActions } from "@/components/trust/member-actions";

export const metadata = { title: "Chat" };

export default async function ConnectionChatPage({ params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  // RLS ensures only a participant can read this handshake.
  const { data: hs } = await supabase
    .from("sprint_handshakes")
    .select("id, status, contributor_id, sprint:sprints!inner(id, title, creator_id)")
    .eq("id", params.id)
    .maybeSingle();

  if (!hs || !hs.sprint) notFound();
  if (hs.status !== "accepted" && hs.status !== "completed") redirect("/connections");

  const sprint = hs.sprint as unknown as { id: string; title: string; creator_id: string };
  const otherId = hs.contributor_id === user.id ? sprint.creator_id : hs.contributor_id;
  const [{ data: other }, vouchCountRes, myVouchRes, myBlockRes] = await Promise.all([
    supabase.from("profiles").select("full_name, headline").eq("id", otherId).maybeSingle(),
    supabase.from("vouches").select("id", { count: "exact", head: true }).eq("vouchee_id", otherId),
    supabase.from("vouches").select("voucher_id").eq("voucher_id", user.id).eq("vouchee_id", otherId).maybeSingle(),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id).eq("blocked_id", otherId).maybeSingle(),
  ]);
  const otherName = other?.full_name ?? "A member";

  return (
    <>
      <AppNav email={user.email ?? ""} isAdmin={isAdminEmail(user.email)} active="connections" />
      <main id="main" className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center gap-3 border-b border-surface-200 pb-3">
          <Link href="/connections" className="btn-ghost p-2" aria-label="Back to connections">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-surface-900">{otherName}</p>
            <Link href={`/sprints/${sprint.id}`} className="block truncate text-xs text-surface-500 hover:text-surface-800">
              {sprint.title}
            </Link>
          </div>
          <MemberActions
            otherId={otherId}
            otherName={otherName}
            initialVouched={!!myVouchRes.data}
            initialVouchCount={vouchCountRes.count ?? 0}
            initialBlocked={!!myBlockRes.data}
          />
          <CompletePanel
            handshakeId={hs.id}
            meId={user.id}
            isRequester={sprint.creator_id === user.id}
            status={hs.status as string}
          />
        </div>
        <Chat handshakeId={hs.id} meId={user.id} otherName={otherName} />
      </main>
    </>
  );
}
