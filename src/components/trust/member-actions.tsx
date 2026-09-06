"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, MoreVertical, Flag, Ban, ShieldCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { ReportDialog } from "@/components/trust/report-dialog";

/**
 * Trust controls for the other person in a connection: vouch for them (only
 * possible because you've actually connected), report them, or block them.
 * Vouching is the positive signal; report/block are tucked in a menu.
 */
export function MemberActions({
  otherId,
  otherName,
  initialVouched,
  initialVouchCount,
  initialBlocked,
}: {
  otherId: string;
  otherName: string;
  initialVouched: boolean;
  initialVouchCount: number;
  initialBlocked: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [vouched, setVouched] = useState(initialVouched);
  const [count, setCount] = useState(initialVouchCount);
  const [blocked, setBlocked] = useState(initialBlocked);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggleVouch() {
    if (busy) return;
    setBusy(true);
    const next = !vouched;
    // Optimistic — reconcile on error.
    setVouched(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      if (next) {
        await api.post("/vouch", { voucheeId: otherId });
        toast({ variant: "success", title: `You vouched for ${otherName}`, description: "Shukran for standing behind them." });
      } else {
        await api.del("/vouch", { voucheeId: otherId });
      }
    } catch (err) {
      setVouched(!next);
      setCount((c) => c + (next ? -1 : 1));
      toast({ variant: "error", title: "Couldn't update your vouch", description: err instanceof ApiError ? err.message : "Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function toggleBlock() {
    if (busy) return;
    setMenuOpen(false);
    setBusy(true);
    try {
      if (!blocked) {
        await api.post("/block", { blockedId: otherId });
        setBlocked(true);
        toast({ variant: "success", title: `${otherName} blocked`, description: "You won't see each other's requests." });
        router.push("/connections");
        router.refresh();
      } else {
        await api.del("/block", { blockedId: otherId });
        setBlocked(false);
        toast({ variant: "success", title: `${otherName} unblocked` });
        router.refresh();
      }
    } catch (err) {
      toast({ variant: "error", title: "Couldn't update", description: err instanceof ApiError ? err.message : "Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        onClick={toggleVouch}
        disabled={busy}
        aria-pressed={vouched}
        title={vouched ? "You vouch for this member" : "Vouch for this member"}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
          vouched
            ? "border-brand-200 bg-brand-50 text-brand-700"
            : "border-surface-300 bg-white text-surface-600 hover:border-brand-300 hover:text-brand-700"
        }`}
      >
        <BadgeCheck className="h-4 w-4" aria-hidden="true" />
        {vouched ? "Vouched" : "Vouch"}
        {count > 0 ? <span className="font-mono text-[0.7rem] opacity-70">{count}</span> : null}
      </button>

      <div className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="btn-ghost p-2"
          aria-label={`Safety options for ${otherName}`}
          aria-expanded={menuOpen}
        >
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </button>
        {menuOpen ? (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden="true" />
            <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-surface-200 bg-white py-1 shadow-glass-lg">
              <button
                onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-surface-700 hover:bg-surface-50"
              >
                <Flag className="h-4 w-4 text-surface-400" aria-hidden="true" /> Report {otherName}
              </button>
              <button
                onClick={toggleBlock}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-surface-700 hover:bg-surface-50"
              >
                {blocked ? (
                  <><ShieldCheck className="h-4 w-4 text-surface-400" aria-hidden="true" /> Unblock {otherName}</>
                ) : (
                  <><Ban className="h-4 w-4 text-surface-400" aria-hidden="true" /> Block {otherName}</>
                )}
              </button>
            </div>
          </>
        ) : null}
      </div>

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        reportedUserId={otherId}
        targetLabel={otherName}
      />
    </div>
  );
}
