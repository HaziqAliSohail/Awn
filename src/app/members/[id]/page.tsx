import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Languages as LanguagesIcon, BadgeCheck, HandHeart, Sparkles } from "lucide-react";
import { getUser, isAdminEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app/AppNav";
import { MemberActions } from "@/components/trust/member-actions";
import { domainLabel } from "@/lib/domains";

export const metadata = { title: "Member" };

interface ProfileRow {
  id: string;
  full_name: string | null;
  headline: string | null;
  city: string | null;
  region: string | null;
  bio: string | null;
  languages: string[] | null;
  can_help_with: string[] | null;
  have_helped_with: string[] | null;
  volunteer_experience: string | null;
  suspended: boolean | null;
}

interface VouchRow {
  note: string | null;
  created_at: string;
  voucher: { full_name: string | null } | null;
}

export default async function MemberProfilePage({ params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, headline, city, region, bio, languages, can_help_with, have_helped_with, volunteer_experience, suspended"
    )
    .eq("id", params.id)
    .maybeSingle<ProfileRow>();

  if (!profile) notFound();

  const isSelf = profile.id === user.id;
  const viewerIsAdmin = isAdminEmail(user.email);
  // Don't expose a suspended member to ordinary viewers.
  if (profile.suspended && !isSelf && !viewerIsAdmin) notFound();

  const [vouchCountRes, myVouchRes, myBlockRes, recentVouchesRes] = await Promise.all([
    supabase.from("vouches").select("id", { count: "exact", head: true }).eq("vouchee_id", profile.id),
    isSelf
      ? Promise.resolve({ data: null })
      : supabase.from("vouches").select("voucher_id").eq("voucher_id", user.id).eq("vouchee_id", profile.id).maybeSingle(),
    isSelf
      ? Promise.resolve({ data: null })
      : supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id).eq("blocked_id", profile.id).maybeSingle(),
    supabase
      .from("vouches")
      .select("note, created_at, voucher:profiles!vouches_voucher_id_fkey(full_name)")
      .eq("vouchee_id", profile.id)
      .not("note", "is", null)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const name = profile.full_name ?? "A community member";
  const vouchCount = vouchCountRes.count ?? 0;
  const place = [profile.city, profile.region].filter(Boolean).join(", ");
  const canHelp = profile.can_help_with ?? [];
  const haveHelped = profile.have_helped_with ?? [];
  const languages = profile.languages ?? [];
  const recentVouches = (recentVouchesRes.data ?? []) as unknown as VouchRow[];

  return (
    <>
      <AppNav email={user.email ?? ""} isAdmin={viewerIsAdmin} active="needs" />
      <main id="main" className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <Link href="/sprints" className="mb-4 inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </Link>

        <div className="rounded-3xl border border-surface-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-surface-900">{name}</h1>
              {profile.headline ? <p className="mt-1 text-surface-600">{profile.headline}</p> : null}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-surface-500">
                {place ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" aria-hidden="true" /> {place}
                  </span>
                ) : null}
                {vouchCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-brand-700">
                    <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                    {vouchCount} community vouch{vouchCount === 1 ? "" : "es"}
                  </span>
                ) : null}
              </div>
            </div>
            {!isSelf ? (
              <MemberActions
                otherId={profile.id}
                otherName={name}
                initialVouched={!!myVouchRes.data}
                initialVouchCount={vouchCount}
                initialBlocked={!!myBlockRes.data}
              />
            ) : null}
          </div>

          {profile.bio ? (
            <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-surface-700">{profile.bio}</p>
          ) : null}

          {canHelp.length > 0 ? (
            <section className="mt-6">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-surface-900">
                <HandHeart className="h-4 w-4 text-primary" aria-hidden="true" /> Can help with
              </h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {canHelp.map((d) => (
                  <span key={d} className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                    {domainLabel(d)}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {haveHelped.length > 0 ? (
            <section className="mt-5">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-surface-900">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" /> Has helped with before
              </h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {haveHelped.map((d) => (
                  <span key={d} className="badge-surface text-xs">{domainLabel(d)}</span>
                ))}
              </div>
            </section>
          ) : null}

          {languages.length > 0 ? (
            <section className="mt-5">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-surface-900">
                <LanguagesIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Languages
              </h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {languages.map((l) => <span key={l} className="badge-surface text-xs">{l}</span>)}
              </div>
            </section>
          ) : null}

          {profile.volunteer_experience ? (
            <section className="mt-5">
              <h2 className="text-sm font-semibold text-surface-900">Experience</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-surface-700">
                {profile.volunteer_experience}
              </p>
            </section>
          ) : null}
        </div>

        {recentVouches.length > 0 ? (
          <section className="mt-6 rounded-3xl border border-surface-200 bg-white p-6 sm:p-8">
            <h2 className="flex items-center gap-1.5 font-semibold text-surface-900">
              <BadgeCheck className="h-5 w-5 text-brand-600" aria-hidden="true" /> What the community says
            </h2>
            <ul className="mt-4 space-y-4" role="list">
              {recentVouches.map((v, i) => (
                <li key={i} className="rounded-2xl bg-surface-50 p-4">
                  <p className="text-sm leading-relaxed text-surface-700">“{v.note}”</p>
                  <p className="mt-2 text-xs text-surface-400">— {v.voucher?.full_name ?? "A member"}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </>
  );
}
