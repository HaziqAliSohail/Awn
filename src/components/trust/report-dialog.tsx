"use client";

import { useState } from "react";
import { Flag, ShieldAlert, X } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Select, Textarea, Label } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { REPORT_REASONS } from "@/lib/domains";

interface ReportTarget {
  reportedUserId?: string;
  sprintId?: string;
  /** What the reporter is flagging, e.g. "this request" or "this member". */
  targetLabel: string;
}

/**
 * Controlled report modal. Flags a member and/or a need to the app-wide admin
 * queue. Nothing is surfaced to the reported party.
 */
export function ReportDialog({
  open,
  onClose,
  reportedUserId,
  sprintId,
  targetLabel,
}: ReportTarget & { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [reason, setReason] = useState(REPORT_REASONS[0].value);
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function submit() {
    setLoading(true);
    try {
      await api.post("/report", {
        reportedUserId,
        sprintId,
        reason,
        detail: detail.trim() || undefined,
      });
      toast({
        variant: "success",
        title: "Report sent",
        description: "Jazāk Allāhu khayran. Our team will review it privately.",
      });
      onClose();
      setDetail("");
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't send report",
        description: err instanceof ApiError ? err.message : "Try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-surface-900/40 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-surface-200 bg-white p-6 shadow-glass-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            <h2 id="report-title" className="font-semibold text-surface-900">
              Report {targetLabel}
            </h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Close">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-1 text-sm text-surface-500">
          This is private. The person you report is never told who flagged them.
        </p>

        <div className="mt-4">
          <Label htmlFor="report-reason">What&apos;s the issue?</Label>
          <Select id="report-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REPORT_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-3">
          <Label htmlFor="report-detail">Anything else? (optional)</Label>
          <Textarea
            id="report-detail"
            value={detail}
            onChange={(e) => setDetail(e.target.value.slice(0, 1000))}
            rows={3}
            placeholder="Add any context that would help us understand."
          />
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="danger" onClick={submit} loading={loading}>
            <Flag className="h-4 w-4" aria-hidden="true" /> Send report
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Convenience trigger + dialog for surfaces that just need a "Report" link
 * (e.g. a need's detail page).
 */
export function ReportButton(props: ReportTarget & { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          props.className ??
          "inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-red-600"
        }
      >
        <Flag className="h-3.5 w-3.5" aria-hidden="true" /> Report {props.targetLabel}
      </button>
      <ReportDialog open={open} onClose={() => setOpen(false)} {...props} />
    </>
  );
}
