"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, Check, X, ShieldCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { REPORT_REASON_LABEL } from "@/lib/domains";

export interface ReportRow {
  id: string;
  reason: string;
  detail: string | null;
  createdAt: string;
  reporterName: string;
  reportedUserId: string | null;
  reportedName: string | null;
  sprintId: string | null;
  sprintTitle: string | null;
}

export interface SuspendedRow {
  id: string;
  fullName: string;
}

/**
 * The single, app-wide moderation surface. No per-masjid role: one admin (or a
 * couple of trusted volunteers on the ADMIN_EMAILS allowlist) works this queue.
 */
export function AdminModeration({
  reports,
  suspended,
}: {
  reports: ReportRow[];
  suspended: SuspendedRow[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    try {
      await fn();
      toast({ variant: "success", title: ok });
      router.refresh();
    } catch (err) {
      toast({ variant: "error", title: "Action failed", description: err instanceof ApiError ? err.message : "Try again." });
    } finally {
      setBusy(null);
    }
  }

  const suspend = (userId: string, name: string) =>
    run(`suspend-${userId}`, () => api.post("/admin/suspend", { userId, suspended: true }), `${name} suspended`);
  const reinstate = (userId: string, name: string) =>
    run(`reinstate-${userId}`, () => api.post("/admin/suspend", { userId, suspended: false }), `${name} reinstated`);
  const resolve = (reportId: string, status: "actioned" | "dismissed") =>
    run(`report-${reportId}-${status}`, () => api.post("/admin/resolve-report", { reportId, status }), status === "actioned" ? "Report actioned" : "Report dismissed");

  return (
    <>
      <h2 className="mt-10 text-sm font-semibold text-surface-700">
        Open reports {reports.length > 0 ? <span className="ml-1 rounded-full bg-red-50 px-2 py-0.5 font-mono text-xs text-red-600">{reports.length}</span> : null}
      </h2>
      {reports.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-surface-200 bg-white px-4 py-6 text-center text-sm text-surface-400">
          Nothing to review. Al-ḥamdu lillāh.
        </p>
      ) : (
        <ul className="mt-3 space-y-3" role="list">
          {reports.map((r) => (
            <li key={r.id} className="rounded-2xl border border-surface-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 font-mono text-[0.65rem] uppercase text-red-600">
                  {REPORT_REASON_LABEL[r.reason] ?? r.reason}
                </span>
                <span className="text-xs text-surface-400">reported by {r.reporterName}</span>
                <span className="ml-auto font-mono text-[0.7rem] text-surface-400">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>

              <p className="mt-2 text-sm text-surface-700">
                {r.reportedName ? <>Member: <span className="font-medium">{r.reportedName}</span></> : null}
                {r.reportedName && r.sprintTitle ? " · " : null}
                {r.sprintId ? (
                  <>Need: <Link href={`/sprints/${r.sprintId}`} className="font-medium text-brand-700 hover:underline">{r.sprintTitle ?? "view"}</Link></>
                ) : null}
              </p>
              {r.detail ? <p className="mt-1 whitespace-pre-wrap rounded-lg bg-surface-50 p-2 text-sm text-surface-600">{r.detail}</p> : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {r.reportedUserId ? (
                  <Button size="sm" variant="danger" loading={busy === `suspend-${r.reportedUserId}`} onClick={() => suspend(r.reportedUserId!, r.reportedName ?? "Member")}>
                    <Ban className="h-4 w-4" aria-hidden="true" /> Suspend member
                  </Button>
                ) : null}
                <Button size="sm" variant="secondary" loading={busy === `report-${r.id}-actioned`} onClick={() => resolve(r.id, "actioned")}>
                  <Check className="h-4 w-4" aria-hidden="true" /> Mark actioned
                </Button>
                <Button size="sm" variant="ghost" loading={busy === `report-${r.id}-dismissed`} onClick={() => resolve(r.id, "dismissed")}>
                  <X className="h-4 w-4" aria-hidden="true" /> Dismiss
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 text-sm font-semibold text-surface-700">Suspended members</h2>
      {suspended.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-surface-200 bg-white px-4 py-6 text-center text-sm text-surface-400">
          No one is suspended.
        </p>
      ) : (
        <ul className="mt-3 space-y-2" role="list">
          {suspended.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-2xl border border-surface-200 bg-white px-4 py-3">
              <span className="text-sm font-medium text-surface-800">{m.fullName}</span>
              <Button size="sm" variant="secondary" loading={busy === `reinstate-${m.id}`} onClick={() => reinstate(m.id, m.fullName)}>
                <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Reinstate
              </Button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
