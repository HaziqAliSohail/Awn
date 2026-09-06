import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Verifies the user is authenticated and has completed onboarding.
 *
 * Why this exists: when a Supabase token expires the middleware *may*
 * still see a user (cached / partially-refreshed), but the subsequent
 * RLS-protected query to `profiles` returns null data + an error.
 * Without checking the error we'd wrongly redirect to /onboarding
 * instead of /login.
 *
 * Returns the authenticated user, the Supabase client, and the profile row.
 */
export async function requireProfile<T extends Record<string, unknown> = { id: string }>(
  select = "id" as string
): Promise<{
  user: User;
  supabase: Awaited<ReturnType<typeof createClient>>;
  profile: T;
}> {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(select)
    .eq("id", user.id)
    .maybeSingle();

  // Auth / RLS error → session is bad, send to login (not onboarding).
  if (error) {
    console.error("requireProfile: query error, likely expired session", error.message);
    redirect("/login");
  }

  // Genuinely no profile row → user hasn't onboarded yet.
  if (!profile) redirect("/onboarding");

  return { user, supabase, profile: profile as unknown as T };
}
