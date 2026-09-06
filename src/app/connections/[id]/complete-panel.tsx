"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, HeartHandshake } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea, Label } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

/**
 * Completion control shown in the chat header. Only the requester (the person
 * who received the help) can confirm completion, so a helper can't close it
 * prematurely. No proof/deliverable is asked for — most help has no artifact.
 * Marking it done also closes the underlying request (handled server-side).
 */
export function CompletePanel({
  handshakeId,
  isRequester,
  status,
}: {
  handshakeId: string;
  isRequester: boolean;
  status: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  if (status === "completed") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Completed
      </span>
    );
  }

  // Only the requester sees the control; the helper waits for confirmation.
  if (!isRequester) return null;

  async function confirm() {
    setLoading(true);
    try {
      // Optional thank-you goes into the chat first, so the helper sees the shukr.
      const shukr = note.trim();
      if (shukr) {
        await api.post("/messages", { handshakeId, body: shukr });
      }
      await api.patch("/handshake", { handshakeId, status: "completed" });
      toast({ variant: "success", title: "Marked as completed", description: "Jazāk Allāhu khayran for helping one another." });
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast({ variant: "error", title: "Couldn't complete", description: err instanceof ApiError ? err.message : "Try again." });
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)} className="shrink-0">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Mark as completed
      </Button>
    );
  }

  return (
    <div className="absolute right-0 top-full z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-surface-200 bg-white p-4 shadow-glass-lg">
      <div className="flex items-center gap-2 text-brand-700">
        <HeartHandshake className="h-5 w-5" aria-hidden="true" />
        <h2 className="font-semibold text-surface-900">Was the help completed?</h2>
      </div>
      <p className="mt-1 text-sm text-surface-500">
        This closes the request so it leaves the open feed. Only you can confirm it.
      </p>
      <div className="mt-3">
        <Label htmlFor="shukr">A word of thanks (optional)</Label>
        <Textarea id="shukr" value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} rows={2}
          placeholder="Jazāk Allāhu khayran, may Allah reward you." />
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={confirm} loading={loading}>
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Yes, it&apos;s done
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
          Not yet
        </Button>
      </div>
    </div>
  );
}
