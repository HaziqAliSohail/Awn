import Link from "next/link";
import { LayoutDashboard, HandHeart, MessagesSquare, ShieldCheck, LogOut } from "lucide-react";
import { NotificationBell } from "@/components/app/NotificationBell";

interface AppNavProps {
  email: string;
  isAdmin?: boolean;
  active?: "dashboard" | "needs" | "connections" | "admin";
}

/**
 * Top navigation for the authenticated area. Every member can both ask for
 * help and offer it, so the nav is capability-neutral.
 */
export function AppNav({ email, isAdmin, active }: AppNavProps) {
  const item = (
    href: string,
    key: NonNullable<AppNavProps["active"]>,
    Icon: typeof HandHeart,
    label: string
  ) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active === key
          ? "bg-brand-50 text-brand-700"
          : "text-surface-600 hover:bg-surface-100 hover:text-surface-900"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-surface-200 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2" aria-label="Awn home">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-base font-bold text-white">
              ع
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-surface-900">
              Awn
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
            {item("/dashboard", "dashboard", LayoutDashboard, "Home")}
            {item("/sprints", "needs", HandHeart, "Browse needs")}
            {item("/connections", "connections", MessagesSquare, "Connections")}
            {isAdmin ? item("/admin", "admin", ShieldCheck, "Console") : null}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell />
          <span className="hidden max-w-[14rem] truncate text-sm text-surface-500 md:inline" title={email}>
            {email}
          </span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn-ghost text-sm">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
