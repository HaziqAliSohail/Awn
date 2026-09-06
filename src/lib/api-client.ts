import { createClient } from "@/lib/supabase/client";

/**
 * Browser → FastAPI client. Attaches the Supabase access token as a bearer so
 * the Python backend can verify identity and query Postgres under RLS.
 * Reads stay in Next Server Components; this is for mutations + AI calls.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: { auth?: boolean } = {}
): Promise<T> {
  if (!BASE) {
    throw new ApiError("NEXT_PUBLIC_API_URL is not configured", 0);
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth !== false) Object.assign(headers, await authHeaders());

  // Hard client-side timeout so a stalled backend can never spin the UI forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new ApiError("The server took too long to respond. Please try again.", 0);
    }
    throw new ApiError("Network error. Is the API running on port 8000?", 0);
  } finally {
    clearTimeout(timer);
  }

  const json = await res.json().catch(() => ({}) as Record<string, unknown>);

  // Expired / invalid token → clear the stale Supabase session (so the
  // middleware won't redirect us straight back) and send to the login page.
  if (res.status === 401 && typeof window !== "undefined") {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch { /* best-effort */ }
    window.location.replace("/login");
    // Never-resolving promise so callers don't continue.
    return new Promise<T>(() => {});
  }

  if (!res.ok || (json as { success?: boolean }).success === false) {
    throw new ApiError(
      (json as { error?: string }).error || `Request failed (${res.status})`,
      res.status,
      (json as { details?: unknown }).details
    );
  }
  return json as T;
}

export const api = {
  post: <T>(path: string, body?: unknown, opts?: { auth?: boolean }) =>
    request<T>("POST", path, body, opts),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
};
