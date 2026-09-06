"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HandHeart, MessagesSquare, Clock, CheckCircle2 } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea, Label } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

const WAIVER =
  "I understand this is a voluntary act of service (khidmah) for the sake of Allah. No payment is expected on either side.";

export function ClaimPanel({
  sprintId,
  sprintOpen,
  initial,
}: {
  sprintId: string;
  sprintOpen: boolean;
  initial: { id: string; status: string } | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<string | null>(initial?.status ?? null);
  const [handshakeId, setHandshakeId] = useState<string | null>(initial?.id ?? null);
  const [agreed, setAgreed] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  function fail(err: unknown) {
    toast({ variant: "error", title: "Something went wrong", description: err instanceof ApiError ? err.message : "Try again." });
  }

  async function offer() {
    if (!agreed) return;
    setLoading(true);
    try {
      const json = await api.post<{ data: { id: string } }>("/handshake", { sprintId, waiverAcknowledged: true, note: note.trim() || undefined });
      setHandshakeId(json.data.id);
      setStatus("matched");
      toast({ variant: "success", title: "Offer sent", description: "Jazāk Allāhu khayran. You'll be notified when they accept." });
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  }

  async function respond(next: "accepted" | "rejected") {
    if (!handshakeId) return;
    setLoading(true);
    try {
      await api.patch("/handshake", { handshakeId, status: next });
      setStatus(next);
      if (next === "accepted") {
        toast({ variant: "success", title: "You're connected", description: "Say salām, the chat is open." });
        router.refresh();
      }
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  }

  const Wrap = ({ children }: { children: React.ReactNode }) => (
    <section className="rounded-3xl border border-surface-200 bg-white p-6">{children}</section>
  );

  if (status === "accepted") {
    return (
      <Wrap>
        <div className="flex items-center gap-2 text-brand-700">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          <h2 className="font-semibold">You&apos;re connected</h2>
        </div>
        <p className="mt-1 text-sm text-surface-500">The chat is open. Coordinate directly.</p>
        <Link href={`/connections/${handshakeId}`} className="btn-primary mt-4">
          <MessagesSquare className="h-4 w-4" aria-hidden="true" /> Open chat
        </Link>
      </Wrap>
    );
  }

  if (status === "invited") {
    return (
      <Wrap>
        <h2 className="font-semibold text-surface-900">You&apos;ve been asked to help</h2>
        <p className="mt-1 text-sm text-surface-500">A member requested you specifically for this. {WAIVER}</p>
        <div className="mt-4 flex gap-3">
          <Button onClick={() => respond("accepted")} loading={loading}><HandHeart className="h-4 w-4" aria-hidden="true" /> Accept & help</Button>
          <Button onClick={() => respond("rejected")} variant="secondary" disabled={loading}>Decline</Button>
        </div>
      </Wrap>
    );
  }

  if (status === "matched") {
    return (
      <Wrap>
        <div className="flex items-center gap-2 text-surface-700">
          <Clock className="h-5 w-5 text-amber-500" aria-hidden="true" />
          <h2 className="font-semibold">Offer sent</h2>
        </div>
        <p className="mt-1 text-sm text-surface-500">Waiting for them to accept. You&apos;ll be able to chat once they do.</p>
      </Wrap>
    );
  }

  if (status === "rejected") {
    return <Wrap><p className="text-sm text-surface-500">This didn&apos;t move forward. May Allah reward your intention.</p></Wrap>;
  }
  if (status === "completed") {
    return <Wrap><p className="text-sm text-surface-600">Completed. Jazāk Allāhu khayran for your service.</p></Wrap>;
  }

  if (!sprintOpen) {
    return <Wrap><p className="text-sm text-surface-500">This request is no longer open.</p></Wrap>;
  }

  // Default: offer to help.
  return (
    <Wrap>
      <h2 className="font-semibold text-surface-900">Offer to help</h2>
      <p className="mt-1 text-sm text-surface-500">Step forward for this request. Chat opens once they accept.</p>

      <div className="mt-4">
        <Label htmlFor="note">A note (optional)</Label>
        <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value.slice(0, 1000))} rows={3}
          placeholder="As-salāmu ʿalaykum, I can help with this. Here's how…" />
      </div>

      <label className="mt-3 flex items-start gap-2.5 text-sm text-surface-600">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-surface-300 text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" />
        <span>{WAIVER}</span>
      </label>

      <Button onClick={offer} loading={loading} disabled={!agreed} className="mt-4 w-full">
        <HandHeart className="h-4 w-4" aria-hidden="true" /> Offer to help
      </Button>
    </Wrap>
  );
}
