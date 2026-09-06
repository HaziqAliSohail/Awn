import Link from "next/link";
import { Plus, HandHeart, Clock, Users, MapPin } from "lucide-react";
import { isAdminEmail } from "@/lib/auth";
import { requireProfile } from "@/lib/require-profile";
import { AppNav } from "@/components/app/AppNav";
import { domainLabel, SPRINT_STATUS } from "@/lib/domains";

export const metadata = { title: "Needs" };

interface Row {
  id: string;
  title: string;
  domain: string;
  estimated_hours: number | null;
  org_name: string | null;
  requester_kind: string | null;
  status: string;
  city: string | null;
  required_gender: string | null;
}

const SELECT =
  "id, title, domain, estimated_hours, org_name, requester_kind, status, city, required_gender";

export default async function SprintsPage({
  searchParams,
}: {
  searchParams: { mine?: string; scope?: string };
}) {
  const { user, supabase, profile } = await requireProfile<{ city: string | null }>("city");

  const mine = searchParams.mine === "1";
  const city = (profile.city ?? "").trim();
  const hasCity = city.length > 0;
  // On the "help others" view, default to the viewer's town when they have one;
  // ?scope=all shows every open request.
  const townOnly = !mine && hasCity && searchParams.scope !== "all";

  let rows: Row[] = [];
  if (mine) {
    const { data } = await supabase
      .from("sprints")
      .select(SELECT)
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false })
      .limit(60);
    rows = (data ?? []) as Row[];
  } else {
    let q = supabase
      .from("sprints")
      .select(SELECT)
      .eq("status", "open")
      .neq("creator_id", user.id)
      .order("created_at", { ascending: false })
      .limit(60);
    if (townOnly) q = q.ilike("city", city); // case-insensitive exact city match
    const { data } = await q;
    rows = (data ?? []) as Row[];
  }

  const heading = mine ? "My requests" : "Where you can help";
  const subtitle = mine
    ? "Requests you've posted, with their status."
    : townOnly
    ? `Open requests in ${city}. Offer your help for the sake of Allah.`
    : "Open requests from the community. Offer your help for the sake of Allah.";

  return (
    <>
      <AppNav email={user.email ?? ""} isAdmin={isAdminEmail(user.email)} active="needs" />
      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-surface-900">{heading}</h1>
            <p className="mt-1 text-surface-500">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2" role="tablist" aria-label="Filter">
            <Link href="/sprints" aria-current={!mine ? "page" : undefined}
              className={!mine ? "btn-primary text-sm" : "btn-outline text-sm"}>
              <Users className="h-4 w-4" aria-hidden="true" /> Help others
            </Link>
            <Link href="/sprints?mine=1" aria-current={mine ? "page" : undefined}
              className={mine ? "btn-primary text-sm" : "btn-outline text-sm"}>
              My requests
            </Link>
            <Link href="/sprints/new" className="btn-brand text-sm">
              <Plus className="h-4 w-4" aria-hidden="true" /> Ask for help
            </Link>
          </div>
        </div>

        {/* City filter — only on the "help others" view */}
        {!mine ? (
          hasCity ? (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-surface-500">
                <MapPin className="h-4 w-4" aria-hidden="true" /> Location
              </span>
              <Link href="/sprints" aria-current={townOnly ? "page" : undefined}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  townOnly ? "border-primary bg-primary text-white" : "border-surface-300 bg-white text-surface-700 hover:border-primary"
                }`}>
                {city}
              </Link>
              <Link href="/sprints?scope=all" aria-current={!townOnly ? "page" : undefined}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  !townOnly ? "border-primary bg-primary text-white" : "border-surface-300 bg-white text-surface-700 hover:border-primary"
                }`}>
                Everywhere
              </Link>
            </div>
          ) : (
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-600">
              <MapPin className="h-4 w-4 shrink-0 text-surface-400" aria-hidden="true" />
              <span>
                Add your city in your <Link href="/onboarding" className="font-medium text-primary underline">profile</Link> to see requests from your town.
              </span>
            </div>
          )
        ) : null}

        {rows.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-surface-300 bg-white/60 p-12 text-center">
            <HandHeart className="mx-auto h-8 w-8 text-surface-300" aria-hidden="true" />
            <p className="mt-3 font-semibold text-surface-700">
              {mine
                ? "You haven't asked for anything yet"
                : townOnly
                ? `No open requests in ${city}`
                : "No open requests right now"}
            </p>
            <p className="mt-1 text-sm text-surface-500">
              {mine
                ? "Post your first request and we'll shape it in seconds."
                : townOnly
                ? "Try browsing Everywhere, or check back soon in shā’ Allāh."
                : "Check back soon, in shā’ Allāh. New requests appear here."}
            </p>
            {mine ? <Link href="/sprints/new" className="btn-primary mt-5 text-sm"><Plus className="h-4 w-4" aria-hidden="true" /> Ask for help</Link> : null}
          </div>
        ) : (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {rows.map((s) => {
              const st = SPRINT_STATUS[s.status] ?? SPRINT_STATUS.open;
              return (
                <li key={s.id}>
                  <Link href={`/sprints/${s.id}`} className="block rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    <article className="sprint-card group h-full">
                      <div className="flex items-center justify-between gap-2">
                        <span className="badge-brand">{domainLabel(s.domain)}</span>
                        <span className={`badge border font-mono text-[0.65rem] uppercase ${st.className}`}>{st.label}</span>
                      </div>
                      <p className="mt-3 text-xs font-medium uppercase tracking-wider text-surface-400">
                        {s.requester_kind === "organization" && s.org_name ? s.org_name : "A community member"}
                      </p>
                      <h2 className="mt-1 text-lg font-bold leading-snug text-surface-900 group-hover:text-brand-700">
                        {s.title}
                      </h2>
                      <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-xs text-surface-400">
                        {s.estimated_hours ? <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{s.estimated_hours}h</span> : null}
                        {s.city ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden="true" />{s.city}</span> : null}
                        {s.required_gender ? <span className="text-brand-600">· {s.required_gender === "female" ? "Sisters only" : "Brothers only"}</span> : null}
                      </div>
                    </article>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
