"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Msg {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

/**
 * Live chat backed by Supabase Realtime. Reads and inserts go through the
 * RLS-protected `messages` table; postgres_changes delivery is RLS-scoped, so
 * only the two participants of this accepted connection receive messages.
 */
export function Chat({
  handshakeId,
  meId,
  otherName,
  closed = false,
}: {
  handshakeId: string;
  meId: string;
  otherName: string;
  /** When the connection is completed, history stays readable but sending is closed. */
  closed?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("handshake_id", handshakeId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (active && data) setMessages(data as Msg[]);
        if (active) setReady(true);
      });

    const channel = supabase
      .channel(`messages:${handshakeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `handshake_id=eq.${handshakeId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, handshakeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    const { error } = await supabase.from("messages").insert({ handshake_id: handshakeId, sender_id: meId, body });
    if (error) setText(body); // restore on failure
    setSending(false);
  }

  return (
    <>
      <div className="flex-1 space-y-3 overflow-y-auto py-4" aria-live="polite" aria-label={`Conversation with ${otherName}`}>
        {ready && messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-surface-400">
            No messages yet. Say As-salāmu ʿalaykum 👋
          </p>
        ) : null}
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm",
                  mine ? "bg-primary text-white" : "border border-surface-200 bg-white text-surface-800"
                )}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {closed ? (
        <div className="flex items-center justify-center gap-2 border-t border-surface-200 pt-3 text-sm text-surface-500">
          <CheckCircle2 className="h-4 w-4 text-brand-600" aria-hidden="true" />
          This help is complete — the chat is now closed. Jazāk Allāhu khayran.
        </div>
      ) : (
        <form onSubmit={send} className="flex items-center gap-2 border-t border-surface-200 pt-3">
          <label htmlFor="msg" className="sr-only">Message</label>
          <input
            id="msg"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 4000))}
            placeholder="Write a message…"
            className="h-11 flex-1 rounded-xl border border-surface-300 bg-white px-3.5 text-sm text-surface-900 placeholder:text-surface-400 focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="btn-primary h-11 w-11 !px-0"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      )}
    </>
  );
}
