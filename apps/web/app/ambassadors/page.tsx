"use client";

import { useDeferredValue, useEffect, useState } from "react";

import { AmbassadorCard } from "@/components/ambassador-card";
import { useSession } from "@/components/session-provider";
import { ApiError, fetchAmbassadors } from "@/lib/api";
import type { AmbassadorCard as AmbassadorCardType } from "@/lib/types";

export default function AmbassadorDirectoryPage() {
  const { session } = useSession();
  const [ambassadors, setAmbassadors] = useState<AmbassadorCardType[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.token) {
      return;
    }
    void fetchAmbassadors(session.token)
      .then(setAmbassadors)
      .catch((value) => {
        const message = value instanceof ApiError ? value.message : "Unable to load ambassadors.";
        setError(message);
      });
  }, [session?.token]);

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const filtered = ambassadors.filter((ambassador) => {
    if (!deferredQuery) {
      return true;
    }
    const haystack = [
      ambassador.name,
      ambassador.program,
      ambassador.major,
      ambassador.bio,
      ambassador.interests.join(" "),
      ambassador.country ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(deferredQuery);
  });

  return (
    <div className="space-y-8">
      <section className="surface-card">
        <div className="section-kicker">Ambassador directory</div>
        <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold text-[var(--ink)]">Find someone who fits the question</h1>
            <p className="mt-4 text-base leading-7 text-[var(--muted)]">
              Browse by program, interest area, or international background. This MVP prioritizes
              fit over volume.
            </p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search MSITM, housing, consulting, India..."
            className="w-full max-w-md rounded-full border border-[var(--line)] bg-white/80 px-5 py-3 text-sm text-[var(--ink)] outline-none ring-[var(--accent)] transition focus:ring-2"
          />
        </div>
      </section>

      {error ? (
        <div className="surface-card text-sm text-[#8d2c30]">{error}</div>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((ambassador) => (
            <AmbassadorCard key={ambassador.user_id} ambassador={ambassador} />
          ))}
        </section>
      )}
    </div>
  );
}

