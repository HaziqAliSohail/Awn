"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/** Accept / decline a pending connection (an invite you received or an offer on your request). */
export function ConnectionActions({ handshakeId }: { handshakeId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<"accepted" | "rejected" | null>(null);

  async function respond(status: "accepted" | "rejected") {
    setLoading(status);
    try {
      await api.patch("/handshake", { handshakeId, status });
      toast({
        variant: "success",
        title: status === "accepted" ? "Connected, chat is open" : "Declined",
        description: status === "accepted" ? "Say salām and coordinate." : undefined,
      });
      router.refresh();
    } catch (err) {
      toast({ variant: "error", title: "Couldn't update", description: err instanceof ApiError ? err.message : "Try again." });
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={() => respond("accepted")} loading={loading === "accepted"} disabled={loading !== null}>
        Accept
      </Button>
      <Button size="sm" variant="secondary" onClick={() => respond("rejected")} loading={loading === "rejected"} disabled={loading !== null}>
        Decline
      </Button>
    </div>
  );
}
