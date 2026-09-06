"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Sparkles, UserCheck, Clock, MessagesSquare } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface Match {
  id: string;
  fullName: string;
  headline: string;
  skills: string[];
  similarity: number;
  roleType: string;
  hoursAvailable: number;
  hasDone?: boolean;
}

export function MatchPanel({ sprintId, responseCount }: { sprintId: string; responseCount: number }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [requested, setRequested] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function findMatches() {
    setLoading(true);
    try {
      const json = await api.post<{ candidates: Match[] }>("/match-talent", { sprintId, limit: 6 });
      setMatches(json.candidates);
      setRan(true);
    } catch (err) {
      toast({ variant: "error", title: "Couldn't find helpers", description: err instanceof ApiError ? err.message : "Try again." });
    } finally {
      setLoading(false);
    }
  }

  async function request(m: Match) {
    setBusyId(m.id);
    try {
      await api.post("/request-help", { sprintId, contributorId: m.id, waiverAcknowledged: true });
      setRequested((r) => ({ ...r, [m.id]: true }));
      toast({ variant: "success", title: `Request sent to ${m.fullName}`, description: "You'll be able to chat once they accept, in shā’ Allāh." });
    } catch (err) {
      const e = err instanceof ApiError ? err : null;
      if (e?.status === 409) setRequested((r) => ({ ...r, [m.id]: true }));
      toast({ variant: e?.status === 409 ? "info" : "error", title: e?.status === 409 ? "Already requested" : "Couldn't send", description: e?.message ?? "Try again." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-labelledby="find-h" className="rounded-3xl border border-surface-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="find-h" className="flex items-center gap-2 font-semibold text-surface-900">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" /> Find someone to help
          </h2>
          <p className="mt-0.5 text-sm text-surface-500">Best-matched members, respecting your preferences.</p>
        </div>
        <div className="flex items-center gap-2">
          {responseCount > 0 ? (
            <Link href="/connections" className="btn-outline text-sm">
              <MessagesSquare className="h-4 w-4" aria-hidden="true" /> {responseCount} response{responseCount === 1 ? "" : "s"}
            </Link>
          ) : null}
          <Button onClick={findMatches} loading={loading} variant={ran ? "secondary" : "primary"}>
            <Search className="h-4 w-4" aria-hidden="true" /> {ran ? "Refresh" : "Find helpers"}
          </Button>
        </div>
      </div>

      {ran && matches.length === 0 ? (
        <p className="mt-6 rounded-xl bg-surface-50 p-4 text-sm text-surface-500">
          No strong matches yet. As more members join and add their skills, they&apos;ll appear here, or wait for someone to offer on your request.
        </p>
      ) : null}

      {matches.length > 0 ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2" role="list">
          {matches.map((m) => {
            const pct = Math.round(m.similarity * 100);
            return (
              <li key={m.id} className="rounded-2xl border border-surface-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-surface-900">{m.fullName}</p>
                    <p className="truncate text-sm text-surface-500">{m.headline}</p>
                    {m.hasDone ? (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                        ✓ Has done this before
                      </span>
                    ) : null}
                  </div>
                  <span className="shrink-0 font-mono text-xs font-bold text-brand-600">{pct}%</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.skills.slice(0, 4).map((sk) => <span key={sk} className="badge-surface text-[11px]">{sk}</span>)}
                </div>
                <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-surface-400">
                  <span className="capitalize">{m.roleType}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden="true" />{m.hoursAvailable}h/wk</span>
                </div>
                <Button
                  onClick={() => request(m)}
                  loading={busyId === m.id}
                  disabled={requested[m.id]}
                  variant={requested[m.id] ? "secondary" : "primary"}
                  size="sm"
                  className="mt-3 w-full"
                >
                  <UserCheck className="h-4 w-4" aria-hidden="true" />
                  {requested[m.id] ? "Requested" : "Request help"}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
