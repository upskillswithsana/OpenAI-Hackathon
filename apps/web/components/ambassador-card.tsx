import Link from "next/link";

import type { AmbassadorCard as AmbassadorCardType } from "@/lib/types";

export function AmbassadorCard({ ambassador }: { ambassador: AmbassadorCardType }) {
  return (
    <article className="surface-card flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-[var(--ink)]">{ambassador.name}</h3>
          <p className="text-sm text-[var(--muted)]">{ambassador.program}</p>
        </div>
        <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          {ambassador.major}
        </span>
      </div>

      <p className="text-sm leading-6 text-[var(--muted)]">{ambassador.bio}</p>

      <div className="flex flex-wrap gap-2">
        {ambassador.interests.slice(0, 4).map((interest) => (
          <span
            key={interest}
            className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs text-[var(--ink)]"
          >
            {interest}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
        <div className="text-xs text-[var(--muted)]">
          {ambassador.location ?? "Austin"} · {ambassador.country ?? "Global"}
        </div>
        <Link
          href={`/ambassadors/${ambassador.user_id}`}
          className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent)]"
        >
          View profile
        </Link>
      </div>
    </article>
  );
}

