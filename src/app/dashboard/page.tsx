import { redirect } from "next/navigation";
import Link from "next/link";
import { HandHeart, Plus, MessagesSquare, ArrowRight, AlertTriangle } from "lucide-react";
import { isAdminEmail } from "@/lib/auth";
import { requireProfile } from "@/lib/require-profile";
import { AppNav } from "@/components/app/AppNav";

export const metadata = { title: "Home" };

export default async function DashboardPage() {
  const { user, supabase, profile } = await requireProfile<{
    full_name: string;
    headline: string;
    role_type: string;
    skills: string[];
    embedding: unknown;
  }>("full_name, headline, role_type, skills, embedding");

  const isAdmin = isAdminEmail(user.email);
  const isTalent = profile.role_type === "professional" || profile.role_type === "student";

  const [{ count: myRequests }, { count: myConnections }] = await Promise.all([
    supabase.from("sprints").select("id", { count: "exact", head: true }).eq("creator_id", user.id),
    supabase.from("sprint_handshakes").select("id", { count: "exact", head: true }).eq("contributor_id", user.id),
  ]);

  const matchReady = Boolean(profile.embedding);

  const Card = ({ href, icon: Icon, title, sub, brand }: { href: string; icon: typeof HandHeart; title: string; sub: string; brand?: boolean }) => (
    <Link href={href} className={`group flex items-center justify-between rounded-2xl border p-6 transition-colors ${brand ? "border-brand-200 bg-brand-50/60 hover:bg-brand-50" : "border-surface-200 bg-white hover:border-surface-300"}`}>
      <div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${brand ? "bg-primary text-white" : "bg-surface-900 text-brand-400"}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="mt-3 font-semibold text-surface-900">{title}</p>
        <p className="text-sm text-surface-500">{sub}</p>
      </div>
      <ArrowRight className="h-5 w-5 text-surface-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );

  return (
    <>
      <AppNav email={user.email ?? ""} isAdmin={isAdmin} active="dashboard" />
      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="font-mono text-xs uppercase tracking-wider text-surface-400">As-salāmu ʿalaykum</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-surface-900">{profile.full_name}</h1>
        <p className="mt-1 text-surface-500">{profile.headline}</p>

        {isTalent && !matchReady ? (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">You&apos;re not searchable yet</p>
              <p className="mt-0.5">Add a few skills so members can find you. <Link href="/onboarding" className="font-medium underline">Update profile</Link>.</p>
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card href="/sprints/new" icon={Plus} title="Ask for help" sub="Describe what you need and AI shapes it." brand />
          <Card href="/sprints" icon={HandHeart} title="Help others" sub="Browse open requests from the community." />
          <Card href="/connections" icon={MessagesSquare} title="Connections" sub={`${myConnections ?? 0} you're helping · ${myRequests ?? 0} you've asked`} />
        </div>
      </main>
    </>
  );
}
