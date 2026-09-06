/**
 * Login page — Passwordless magic link authentication via Supabase Auth.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/callback`,
        },
      });

      if (authError) {
        throw authError;
      }

      setIsSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send magic link"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-mesh px-4">
      <div className="w-full max-w-md">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        {/* Card */}
        <div className="rounded-3xl glass border-surface-200/60 p-8 shadow-glass-lg">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <span className="font-display text-lg font-bold text-white">ع</span>
            </div>
            <span className="font-display text-xl font-bold text-surface-900 tracking-tight">
              Awn
            </span>
            <span className="text-sm text-surface-400 font-medium">عَوْن</span>
          </div>

          {isSent ? (
            /* Success state */
            <div className="text-center py-4 animate-fade-in">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 mx-auto mb-4">
                <CheckCircle2 className="h-7 w-7 text-brand-500" />
              </div>
              <h1 className="font-display text-xl font-bold text-surface-900">
                Check Your Email
              </h1>
              <p className="mt-2 text-sm text-surface-500 leading-relaxed">
                We sent a magic link to{" "}
                <span className="font-semibold text-surface-700">{email}</span>.
                Click it to sign in. No password needed.
              </p>
              <button
                onClick={() => {
                  setIsSent(false);
                  setEmail("");
                }}
                className="mt-6 btn-ghost text-sm"
              >
                Use a different email
              </button>
            </div>
          ) : (
            /* Login form */
            <>
              <h1 className="font-display text-2xl font-bold text-surface-900">
                As-salāmu ʿalaykum
              </h1>
              <p className="mt-1 text-sm text-surface-500">
                Enter your email and we&apos;ll send a secure link. No password to remember.
              </p>

              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-sm font-semibold text-surface-700 mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-xl border border-surface-300 bg-white ps-10 pe-4 py-3 text-sm text-surface-900 placeholder:text-surface-400 focus-ring transition-colors focus:border-brand-400"
                    />
                  </div>
                </div>

                {error && (
                  <div className="space-y-2">
                    <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                      {error}
                    </p>
                    {error.includes("rate limit") && (
                      <p className="text-xs text-surface-500 bg-surface-100 p-2.5 rounded-lg border border-surface-200">
                        <strong>Supabase Auth Rate Limit:</strong> You requested magic links too quickly within a short timeframe. Please wait ~15 minutes for the quota to reset, or check your inbox for an earlier magic link email.
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!email || isLoading}
                  className="w-full btn-brand py-3.5"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending link...
                    </>
                  ) : (
                    "Send Magic Link"
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-surface-400">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
