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
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8c3f00] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]">
                  <img src="/ut-tower.svg" alt="UT Tower" className="h-8 w-8" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(255,245,236,0.95)]">
                    UT Austin
                  </div>
                  <div className="text-lg font-semibold tracking-tight text-[var(--ink)]">
                    Ambassador Connect
                  </div>
                  <div className="text-xs uppercase tracking-[0.24em] text-[rgba(55,33,16,0.82)]">
                    Hybrid campus guidance
                  </div>
                </div>
              </Link>
              {session ? (
                <span className="hidden rounded-full border border-[rgba(255,255,255,0.35)] bg-[rgba(255,255,255,0.2)] px-3 py-1 text-xs font-medium text-[var(--ink)] sm:inline-flex">
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
                        : "text-[var(--ink)] hover:bg-[rgba(255,255,255,0.35)]",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <label className="flex items-center gap-3 rounded-full border border-[rgba(255,255,255,0.35)] bg-[rgba(255,255,255,0.35)] px-3 py-2 text-sm text-[var(--ink)]">
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
