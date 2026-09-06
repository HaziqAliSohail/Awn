import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, MapPin, Users2 } from "lucide-react";
import { getUser, isAdminEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app/AppNav";
import { domainLabel, SPRINT_STATUS } from "@/lib/domains";
import { MatchPanel } from "./match-panel";
import { ClaimPanel } from "./claim-panel";

export default async function SprintDetailPage({ params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: s } = await supabase
    .from("sprints")
    .select("id, creator_id, org_name, requester_kind, title, domain, deliverables, prerequisites, estimated_hours, status, raw_input, required_gender, languages_needed, city")
    .eq("id", params.id)
    .maybeSingle();
  if (!s) notFound();

  const isOwner = s.creator_id === user.id;

  // The viewer's own connection to this need (as a helper), if any.
  const { data: myHandshake } = await supabase
    .from("sprint_handshakes")
    .select("id, status")
    .eq("sprint_id", s.id)
    .eq("contributor_id", user.id)
    .maybeSingle();

  // Owner: how many people have responded.
  const { count: responseCount } = isOwner
    ? await supabase.from("sprint_handshakes").select("id", { count: "exact", head: true }).eq("sprint_id", s.id)
    : { count: 0 };

  const st = SPRINT_STATUS[s.status] ?? SPRINT_STATUS.open;

  return (
    <>
      <AppNav email={user.email ?? ""} isAdmin={isAdminEmail(user.email)} active="needs" />
      <main id="main" className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/sprints" className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </Link>

        <article className="mt-5 rounded-3xl border border-surface-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge-brand">{domainLabel(s.domain)}</span>
            <span className={`badge border font-mono text-[0.65rem] uppercase ${st.className}`}>{st.label}</span>
            <span className="ml-auto inline-flex items-center gap-1 font-mono text-xs text-surface-400">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />{s.estimated_hours}H
            </span>
          </div>

          <p className="mt-4 font-mono text-xs uppercase tracking-wider text-surface-400">
            {s.requester_kind === "organization" && s.org_name ? s.org_name : "A community member"}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-surface-900">{s.title}</h1>

          {(s.city || s.required_gender || (s.languages_needed?.length ?? 0) > 0) ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-xs text-surface-500">
              {s.city ? <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{s.city}</span> : null}
              {s.required_gender ? <span className="inline-flex items-center gap-1 text-brand-600"><Users2 className="h-3.5 w-3.5" aria-hidden="true" />{s.required_gender === "female" ? "Sisters only" : "Brothers only"}</span> : null}
              {(s.languages_needed ?? []).map((l: string) => <span key={l} className="badge-surface">{l}</span>)}
            </div>
          ) : null}

          <section className="mt-6" aria-labelledby="deliverables-h">
            <h2 id="deliverables-h" className="text-sm font-semibold text-surface-700">What&apos;s needed</h2>
            <ul className="mt-2 space-y-2" role="list">
              {(s.deliverables as string[]).map((d, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-surface-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  {d}
                </li>
              ))}
            </ul>
          </section>

          {(s.prerequisites as string[])?.length ? (
            <section className="mt-6">
              <h2 className="text-sm font-semibold text-surface-700">Helpful skills</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(s.prerequisites as string[]).map((p) => <span key={p} className="badge-surface">{p}</span>)}
              </div>
            </section>
          ) : null}

          {isOwner ? (
            <section className="mt-6 border-t border-surface-100 pt-5">
              <h2 className="text-sm font-semibold text-surface-700">Your original words <span className="font-normal text-surface-400">(only you see this)</span></h2>
              <p className="mt-2 whitespace-pre-wrap rounded-xl bg-surface-50 p-3 text-sm text-surface-600">{s.raw_input}</p>
            </section>
          ) : null}
        </article>

        <div className="mt-6">
          {isOwner ? (
            <MatchPanel sprintId={s.id} responseCount={responseCount ?? 0} />
          ) : (
            <ClaimPanel
              sprintId={s.id}
              sprintOpen={s.status === "open"}
              initial={myHandshake ? { id: myHandshake.id as string, status: myHandshake.status as string } : null}
            />
          )}
        </div>
      </main>
    </>
  );
}
