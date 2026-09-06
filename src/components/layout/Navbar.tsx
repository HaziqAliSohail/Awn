"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, LayoutDashboard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Ways to help", href: "#what" },
  { label: "Give & receive", href: "#for-orgs" },
  { label: "Trust", href: "#for-talent" },
];

interface NavbarProps {
  onOpenIntake?: () => void;
}

export function Navbar({ onOpenIntake }: NavbarProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  // null = still checking; avoids flashing "Sign In" before we know.
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setAuthed(!!data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <nav className="glass border-b border-surface-200/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group" aria-label="Awn Home">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary transition-transform group-hover:scale-105">
                <span className="font-display text-lg font-bold text-white">ع</span>
              </div>
              <span className="font-display text-xl font-bold text-surface-900 tracking-tight">Awn</span>
              <span className="text-sm text-surface-400 font-medium hidden sm:inline">عَوْن</span>
            </Link>

            {/* Desktop section links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} className="btn-ghost text-sm rounded-lg">
                  {link.label}
                </a>
              ))}
            </div>

            {/* Auth-aware CTA */}
            <div className="hidden md:flex items-center gap-3">
              {authed === null ? (
                <div className="h-9 w-40" aria-hidden="true" />
              ) : authed ? (
                <>
                  <Link href="/dashboard" className="btn-brand text-sm px-5 py-2.5">
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                    Dashboard
                  </Link>
                  <form action="/auth/signout" method="post">
                    <button type="submit" className="btn-ghost text-sm">
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-ghost text-sm">Sign In</Link>
                  {onOpenIntake ? (
                    <button onClick={onOpenIntake} className="btn-brand text-sm px-5 py-2.5">Ask for help</button>
                  ) : (
                    <Link href="/login" className="btn-brand text-sm px-5 py-2.5">Ask for help</Link>
                  )}
                </>
              )}
            </div>

            {/* Mobile Toggle */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden btn-ghost p-2"
              aria-label="Toggle menu"
              aria-expanded={isOpen}
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={cn("md:hidden overflow-hidden transition-all duration-300 ease-out", isOpen ? "max-h-72 border-t border-surface-200/50" : "max-h-0")}>
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="block rounded-lg px-3 py-2 text-sm text-surface-700 hover:bg-surface-100" onClick={() => setIsOpen(false)}>
                {link.label}
              </a>
            ))}
            <div className="pt-2 border-t border-surface-200 space-y-2">
              {authed ? (
                <>
                  <Link href="/dashboard" className="block w-full btn-brand text-center text-sm py-2.5">Dashboard</Link>
                  <form action="/auth/signout" method="post">
                    <button type="submit" className="block w-full btn-ghost text-center text-sm py-2.5">Sign out</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="block w-full btn-brand text-center text-sm py-2.5">Ask for help</Link>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
