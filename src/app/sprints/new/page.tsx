import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/auth";
import { requireProfile } from "@/lib/require-profile";
import { AppNav } from "@/components/app/AppNav";
import { NewSprintForm } from "./new-sprint-form";

export const metadata = { title: "Ask for help" };

export default async function NewSprintPage() {
  const { user } = await requireProfile();

  return (
    <>
      <AppNav email={user.email ?? ""} isAdmin={isAdminEmail(user.email)} active="needs" />
      <main id="main" className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-surface-900">
          Ask the ummah for help
        </h1>
        <p className="mt-2 text-surface-500">
          Whatever you need, whether knowledge, guidance, or a skill, describe it plainly.
          Our AI turns it into a clear request so the right person can step forward, bi&apos;idhnillāh.
        </p>
        <div className="mt-6">
          <NewSprintForm />
        </div>
      </main>
    </>
  );
}
