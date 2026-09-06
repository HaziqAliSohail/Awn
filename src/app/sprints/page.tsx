import Link from "next/link";
import { Plus, HandHeart, Clock, Users, MapPin, Sparkles, Hourglass } from "lucide-react";
import { isAdminEmail } from "@/lib/auth";
import { requireProfile } from "@/lib/require-profile";
import { AppNav } from "@/components/app/AppNav";
import { CATEGORIES, domainLabel, SPRINT_STATUS } from "@/lib/domains";
import { timeAgo } from "@/lib/notifications";

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
  created_at: string;
}

type ProfileBits = {
  city: string | null;
  can_help_with: string[] | null;
  have_helped_with: string[] | null;
};

const SELECT =
  "id, title, domain, estimated_hours, org_name, requester_kind, status, city, required_gender, created_at";

export default async function SprintsPage({
  searchParams,
}: {
  searchParams: { mine?: string; scope?: string; fit?: string; cat?: string };
}) {
  const { user, supabase, profile } = await requireProfile<ProfileBits>(
    "city, can_help_with, have_helped_with"
  );

  const mine = searchParams.mine === "1";
  const city = (profile.city ?? "").trim();
  const hasCity = city.length > 0;
  // On the "help others" view, default to the viewer's town when they have one;
  // ?scope=all shows every open request.
  const townOnly = !mine && hasCity && searchParams.scope !== "all";

  // What this member can help with — the union of "can help" and "have done".
  const helpDomains = Array.from(
    new Set([...(profile.can_help_with ?? []), ...(profile.have_helped_with ?? [])])
  );
  const fit = !mine && searchParams.fit === "1" && helpDomains.length > 0;
  // Validate the category param against the known list so it can't inject.
  const cat = !mine ? CATEGORIES.find((c) => c.value === searchParams.cat)?.value : undefined;

  // Preserve the active filters when building each chip's link.
  const current = { scope: searchParams.scope, fit: searchParams.fit, cat: searchParams.cat };
  const hrefWith = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...current, ...over })) if (v) p.set(k, v);
    const qs = p.toString();
    return qs ? `/sprints?${qs}` : "/sprints";
  };

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
    if (fit) q = q.in("domain", helpDomains); // only categories I can help with
    if (cat) q = q.eq("domain", cat); // a single chosen category
    const { data } = await q;
    rows = (data ?? []) as Row[];
  }

  const filtered = fit || !!cat;
  const heading = mine ? "My requests" : "Where you can help";
  const subtitle = mine
    ? "Requests you've posted, with their status."
    : townOnly
    ? `Open requests in ${city}. Offer your help for the sake of Allah.`
    : "Open requests from the community. Offer your help for the sake of Allah.";

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm transition-colors ${
      active
        ? "border-primary bg-primary text-white"
        : "border-surface-300 bg-white text-surface-700 hover:border-primary"
    }`;

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

        {/* Filters — only on the "help others" view */}
        {!mine ? (
          <div className="mt-5 space-y-3">
            {/* Location + skills row */}
            <div className="flex flex-wrap items-center gap-2">
              {hasCity ? (
                <>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-surface-500">
                    <MapPin className="h-4 w-4" aria-hidden="true" /> Location
                  </span>
                  <Link href={hrefWith({ scope: undefined })} aria-current={townOnly ? "page" : undefined} className={chip(townOnly)}>
                    {city}
                  </Link>
                  <Link href={hrefWith({ scope: "all" })} aria-current={!townOnly ? "page" : undefined} className={chip(!townOnly)}>
                    Everywhere
                  </Link>
                  <span className="mx-1 h-4 w-px bg-surface-200" aria-hidden="true" />
                </>
              ) : null}

              {helpDomains.length > 0 ? (
                <Link
                  href={hrefWith({ fit: fit ? undefined : "1", cat: undefined })}
                  aria-pressed={fit}
                  className={`inline-flex items-center gap-1.5 ${chip(fit)}`}
                  title="Show only categories you can help with"
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Matches my skills
                </Link>
              ) : (
                <Link href="/onboarding" className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-primary">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Set what you can help with →
                </Link>
              )}
            </div>

            {/* Category row — horizontally scrollable so it never wraps the page */}
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              <Link href={hrefWith({ cat: undefined })} aria-current={!cat ? "page" : undefined} className={`shrink-0 ${chip(!cat)}`}>
                All categories
              </Link>
              {CATEGORIES.map((c) => (
                <Link
                  key={c.value}
                  href={hrefWith({ cat: c.value, fit: undefined })}
                  aria-current={cat === c.value ? "page" : undefined}
                  className={`shrink-0 whitespace-nowrap ${chip(cat === c.value)}`}
                >
                  <span aria-hidden="true">{c.emoji}</span> {c.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {rows.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-surface-300 bg-white/60 p-12 text-center">
            <HandHeart className="mx-auto h-8 w-8 text-surface-300" aria-hidden="true" />
            <p className="mt-3 font-semibold text-surface-700">
              {mine
                ? "You haven't asked for anything yet"
                : filtered
                ? "No open requests match these filters"
                : townOnly
                ? `No open requests in ${city}`
                : "No open requests right now"}
            </p>
            <p className="mt-1 text-sm text-surface-500">
              {mine
                ? "Post your first request and we'll shape it in seconds."
                : filtered
                ? "Try clearing a filter, or browse all categories."
                : townOnly
                ? "Try browsing Everywhere, or check back soon in shā’ Allāh."
                : "Check back soon, in shā’ Allāh. New requests appear here."}
            </p>
            {mine ? (
              <Link href="/sprints/new" className="btn-primary mt-5 text-sm"><Plus className="h-4 w-4" aria-hidden="true" /> Ask for help</Link>
            ) : filtered ? (
              <Link href="/sprints" className="btn-outline mt-5 text-sm">Clear filters</Link>
            ) : null}
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
                        <span className="inline-flex items-center gap-1" title="When it was posted"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{timeAgo(s.created_at)}</span>
                        {s.city ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden="true" />{s.city}</span> : null}
                        {s.estimated_hours ? <span className="inline-flex items-center gap-1" title="Estimated effort to help"><Hourglass className="h-3 w-3" aria-hidden="true" />~{s.estimated_hours}h</span> : null}
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
