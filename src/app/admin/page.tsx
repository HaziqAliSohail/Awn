import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, isAdminEmail } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app/AppNav";
import { domainLabel, SPRINT_STATUS } from "@/lib/domains";
import { AdminModeration, type ReportRow, type SuspendedRow } from "./admin-moderation";

export const metadata = { title: "Console" };

export default async function AdminPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!isAdminEmail(user.email)) redirect("/dashboard");

  // Admin gate passed → service client for a full read across the platform.
  const admin = createAdminClient();
  const [needsRes, membersRes, connectionsRes, recentNeeds, reportsRes, suspendedRes, flaggedRes, openReportsCount] = await Promise.all([
    admin.from("sprints").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("sprint_handshakes").select("id", { count: "exact", head: true }),
    admin
      .from("sprints")
      .select("id, title, domain, status, org_name, requester_kind, created_at")
      .order("created_at", { ascending: false })
      .limit(15),
    admin
      .from("reports")
      .select("id, reason, detail, created_at, reporter_id, reported_user_id, sprint_id")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50),
    admin.from("profiles").select("id, full_name").eq("suspended", true).limit(100),
    admin
      .from("sprints")
      .select("id, title, flag_reason, status, created_at")
      .eq("flagged", true)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(25),
    admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  // Resolve reporter/reported names and need titles in one round trip each.
  const rawReports = (reportsRes.data ?? []) as Array<{
    id: string; reason: string; detail: string | null; created_at: string;
    reporter_id: string; reported_user_id: string | null; sprint_id: string | null;
  }>;
  const profileIds = Array.from(new Set(rawReports.flatMap((r) => [r.reporter_id, r.reported_user_id]).filter(Boolean))) as string[];
  const reportSprintIds = Array.from(new Set(rawReports.map((r) => r.sprint_id).filter(Boolean))) as string[];
  const [namesRes, titlesRes] = await Promise.all([
    profileIds.length ? admin.from("profiles").select("id, full_name").in("id", profileIds) : Promise.resolve({ data: [] }),
    reportSprintIds.length ? admin.from("sprints").select("id, title").in("id", reportSprintIds) : Promise.resolve({ data: [] }),
  ]);
  const nameOf = new Map<string, string>((namesRes.data ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]));
  const titleOf = new Map<string, string>((titlesRes.data ?? []).map((s: { id: string; title: string }) => [s.id, s.title]));

  const reports: ReportRow[] = rawReports.map((r) => ({
    id: r.id,
    reason: r.reason,
    detail: r.detail,
    createdAt: r.created_at,
    reporterName: nameOf.get(r.reporter_id) ?? "A member",
    reportedUserId: r.reported_user_id,
    reportedName: r.reported_user_id ? nameOf.get(r.reported_user_id) ?? "A member" : null,
    sprintId: r.sprint_id,
    sprintTitle: r.sprint_id ? titleOf.get(r.sprint_id) ?? null : null,
  }));
  const suspended: SuspendedRow[] = ((suspendedRes.data ?? []) as Array<{ id: string; full_name: string }>).map((m) => ({
    id: m.id, fullName: m.full_name,
  }));
  const flagged = (flaggedRes.data ?? []) as Array<{ id: string; title: string; flag_reason: string | null; status: string; created_at: string }>;

  const stats = [
    { label: "Members", value: membersRes.count ?? 0 },
    { label: "Requests", value: needsRes.count ?? 0 },
    { label: "Connections", value: connectionsRes.count ?? 0 },
    { label: "Open reports", value: openReportsCount.count ?? 0 },
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

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-surface-200 bg-white p-5">
              <p className="font-mono text-xs uppercase tracking-wider text-surface-400">{s.label}</p>
              <p className="mt-2 font-display text-3xl font-bold text-surface-900">{s.value}</p>
            </div>
          ))}
        </div>

        <AdminModeration reports={reports} suspended={suspended} />

        {flagged.length > 0 ? (
          <>
            <h2 className="mt-10 text-sm font-semibold text-surface-700">
              Auto-flagged needs <span className="font-normal text-surface-400">(screened for review)</span>
            </h2>
            <ul className="mt-3 space-y-2" role="list">
              {flagged.map((f) => (
                <li key={f.id} className="flex items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3">
                  <div className="min-w-0">
                    <Link href={`/sprints/${f.id}`} className="font-medium text-surface-900 hover:text-brand-700">{f.title}</Link>
                    {f.flag_reason ? <p className="mt-0.5 text-xs text-surface-500">{f.flag_reason}</p> : null}
                  </div>
                  <span className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[0.65rem] uppercase ${(SPRINT_STATUS[f.status] ?? SPRINT_STATUS.open).className}`}>
                    {(SPRINT_STATUS[f.status] ?? SPRINT_STATUS.open).label}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : null}

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
