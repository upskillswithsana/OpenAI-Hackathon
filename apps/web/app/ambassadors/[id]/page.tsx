"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useSession } from "@/components/session-provider";
import { ApiError, fetchAmbassador } from "@/lib/api";
import type { AmbassadorDetail } from "@/lib/types";

export default function AmbassadorProfilePage() {
  const params = useParams<{ id: string }>();
  const { session } = useSession();
  const [ambassador, setAmbassador] = useState<AmbassadorDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.token || !params.id) {
      return;
    }
    const token = session.token;
    const ambassadorId = params.id;

    let disposed = false;

    async function loadAmbassador() {
      try {
        const result = await fetchAmbassador(token, ambassadorId);
        if (disposed) {
          return;
        }
        setAmbassador(result);
        setError(null);
      } catch (value) {
        if (disposed) {
          return;
        }
        const message = value instanceof ApiError ? value.message : "Unable to load profile.";
        setError(message);
      }
    }

    function handleFocusRefresh() {
      void loadAmbassador();
    }

    function handleVisibilityRefresh() {
      if (document.visibilityState === "visible") {
        void loadAmbassador();
      }
    }

    void loadAmbassador();
    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      disposed = true;
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [params.id, session?.token]);

  if (error) {
    return <div className="surface-card text-sm text-[#8d2c30]">{error}</div>;
  }

  if (!ambassador) {
    return <div className="surface-card text-sm text-[var(--muted)]">Loading ambassador profile...</div>;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="surface-card">
        <div className="section-kicker">Ambassador profile</div>
        <h1 className="mt-5 text-4xl font-semibold text-[var(--ink)]">{ambassador.name}</h1>
        <p className="mt-2 text-lg text-[var(--muted)]">
          {ambassador.program} · {ambassador.major}
        </p>

        <p className="mt-6 text-base leading-7 text-[var(--muted)]">{ambassador.bio}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="metric-pill">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Background</div>
            <div className="mt-2 text-base font-semibold text-[var(--ink)]">
              {ambassador.career_background ?? "Campus mentor"}
            </div>
          </div>
          <div className="metric-pill">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Location</div>
            <div className="mt-2 text-base font-semibold text-[var(--ink)]">
              {ambassador.location ?? "Austin"} · {ambassador.country ?? "Global"}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {ambassador.interests.map((interest) => (
            <span
              key={interest}
              className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-sm text-[var(--ink)]"
            >
              {interest}
            </span>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/ambassadors/${ambassador.user_id}/book`}
            className="rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)]"
          >
            Book mentorship session
          </Link>
          {ambassador.linkedin ? (
            <a
              href={ambassador.linkedin}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[var(--line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)]"
            >
              LinkedIn
            </a>
          ) : null}
        </div>
      </section>

      <aside className="surface-card">
        <div className="section-kicker">Availability snapshot</div>
        <div className="mt-6 space-y-3">
          {ambassador.availability_summary.length ? (
            ambassador.availability_summary.map((item) => (
              <div key={item} className="rounded-[20px] border border-[var(--line)] bg-white/75 px-4 py-3 text-sm text-[var(--ink)]">
                {item}
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-[var(--muted)]">
              This ambassador has not published recurring availability yet.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
