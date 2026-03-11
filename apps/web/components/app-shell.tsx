"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

import { useSession } from "@/components/session-provider";

const NAV_ITEMS = [
  { href: "/", label: "Mission" },
  { href: "/ask", label: "Ask AI" },
  { href: "/ambassadors", label: "Ambassadors" },
  { href: "/dashboard/ambassador", label: "Ambassador Desk" },
  { href: "/meetings", label: "Planned Meetings" },
  { href: "/admin", label: "Admin Upload" },
];

function roleLabel(role: string) {
  return role === "ambassador" ? "Ambassador" : role === "admin" ? "Admin" : "Student";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { demoUsers, session, loginAs, loading, bootstrapError } = useSession();

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <header className="glass-panel sticky top-4 z-20 mb-8 rounded-[28px] px-5 py-4 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-12 min-w-12 items-center justify-center rounded-2xl bg-[var(--accent)] px-2 text-[10px] font-semibold leading-tight text-white">UT Austin</div>
                <div>
                  <div className="text-lg font-semibold tracking-tight text-[var(--ink)]">
                    Ambassador Connect
                  </div>
                  <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                    Hybrid campus guidance
                  </div>
                </div>
              </Link>
              {session ? (
                <span className="hidden rounded-full border border-[var(--line)] px-3 py-1 text-xs font-medium text-[var(--muted)] sm:inline-flex">
                  Active role: {roleLabel(session.user.role)}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <nav className="flex flex-wrap gap-2">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "rounded-full px-3 py-2 text-sm transition-colors",
                      pathname === item.href
                        ? "bg-[var(--ink)] text-white"
                        : "text-[var(--ink)] hover:bg-[var(--paper-strong)]",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <label className="flex items-center gap-3 rounded-full border border-[var(--line)] bg-white/70 px-3 py-2 text-sm text-[var(--muted)]">
                <span className="font-medium text-[var(--ink)]">Demo login</span>
                <select
                  className="min-w-56 bg-transparent text-[var(--ink)] outline-none"
                  value={session?.user.email ?? ""}
                  disabled={loading}
                  onChange={(event) => void loginAs(event.target.value)}
                >
                  <option value="" disabled>
                    {bootstrapError ?? "Select a demo user"}
                  </option>
                  {demoUsers.map((user) => (
                    <option key={user.id} value={user.email}>
                      {user.name} - {roleLabel(user.role)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}




