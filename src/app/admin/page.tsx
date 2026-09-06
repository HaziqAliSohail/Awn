import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, isAdminEmail } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app/AppNav";
import { domainLabel, SPRINT_STATUS } from "@/lib/domains";

export const metadata = { title: "Console" };

export default async function AdminPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!isAdminEmail(user.email)) redirect("/dashboard");

  // Admin gate passed → service client for a full read across the platform.
  const admin = createAdminClient();
  const [needsRes, membersRes, connectionsRes, recentNeeds] = await Promise.all([
    admin.from("sprints").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("sprint_handshakes").select("id", { count: "exact", head: true }),
    admin
      .from("sprints")
      .select("id, title, domain, status, org_name, requester_kind, created_at")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const stats = [
    { label: "Members", value: membersRes.count ?? 0 },
    { label: "Requests", value: needsRes.count ?? 0 },
    { label: "Connections", value: connectionsRes.count ?? 0 },
  ];
  const rows = (recentNeeds.data ?? []) as Array<{
    id: string; title: string; domain: string; status: string; org_name: string | null; requester_kind: string | null; created_at: string;
  }>;

  return (
    <>
      <AppNav email={user.email ?? ""} isAdmin active="admin" />
      <main id="main" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-surface-900">Concierge console</h1>
        <p className="mt-1 text-surface-500">Live platform data. Hand-matching runs via the API (<code className="font-mono text-xs">/admin/hand-match</code>).</p>

        <div className="mt-6 grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-surface-200 bg-white p-5">
              <p className="font-mono text-xs uppercase tracking-wider text-surface-400">{s.label}</p>
              <p className="mt-2 font-display text-3xl font-bold text-surface-900">{s.value}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-10 text-sm font-semibold text-surface-700">Recent requests</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-surface-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-200 font-mono text-xs uppercase tracking-wider text-surface-500">
                <th className="px-4 py-3 font-semibold">Request</th>
                <th className="px-4 py-3 font-semibold">Domain</th>
                <th className="px-4 py-3 font-semibold">By</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {rows.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-surface-400">No requests yet.</td></tr>
              ) : rows.map((r) => {
                const st = SPRINT_STATUS[r.status] ?? SPRINT_STATUS.open;
                return (
                  <tr key={r.id} className="hover:bg-surface-50">
                    <td className="px-4 py-3">
                      <Link href={`/sprints/${r.id}`} className="font-medium text-surface-900 hover:text-brand-700">{r.title}</Link>
                    </td>
                    <td className="px-4 py-3 text-surface-600">{domainLabel(r.domain)}</td>
                    <td className="px-4 py-3 text-surface-500">{r.requester_kind === "organization" && r.org_name ? r.org_name : "Member"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded border px-2 py-0.5 font-mono text-[0.65rem] uppercase ${st.className}`}>{st.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
