import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm, type ProfileInitial } from "./profile-form";

export const metadata = { title: "Your profile" };

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, headline, role_type, gender, skills, languages, city, linkedin_url, hours_available_per_week, bio, can_help_with, have_helped_with, volunteer_experience")
    .eq("id", user.id)
    .maybeSingle();

  const initial: ProfileInitial | null = profile
    ? {
        fullName: profile.full_name ?? "",
        headline: profile.headline ?? "",
        roleType: (profile.role_type ?? "professional") as ProfileInitial["roleType"],
        gender: (profile.gender ?? "") as ProfileInitial["gender"],
        skills: (profile.skills ?? []).join(", "),
        languages: (profile.languages ?? []).join(", "),
        city: profile.city ?? "",
        linkedinUrl: profile.linkedin_url ?? "",
        hoursAvailable: profile.hours_available_per_week ?? 3,
        bio: profile.bio ?? "",
        canHelpWith: profile.can_help_with ?? [],
        haveHelpedWith: profile.have_helped_with ?? [],
        volunteerExperience: profile.volunteer_experience ?? "",
      }
    : null;

  return (
    <main id="main" className="mx-auto min-h-screen max-w-2xl px-4 py-12 sm:py-16">
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-wider text-brand-600">عَوْن · Awn</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-surface-900">
          {initial ? "Edit your profile" : "As-salāmu ʿalaykum, welcome"}
        </h1>
        <p className="mt-2 text-surface-500">
          {initial
            ? "Keep your details current so matches stay accurate."
            : "A few details so the ummah can find you, and so we can match you with care and trust."}
        </p>
      </div>
      <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <ProfileForm initial={initial} email={user.email ?? ""} />
      </div>
    </main>
  );
}
