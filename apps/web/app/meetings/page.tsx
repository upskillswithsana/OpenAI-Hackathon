"use client";

import { useEffect, useMemo, useState } from "react";

import { MeetingCard } from "@/components/meeting-card";
import { useSession } from "@/components/session-provider";
import { ApiError, fetchMyMeetings } from "@/lib/api";
import type { Meeting } from "@/lib/types";

function byStartTime(left: Meeting, right: Meeting) {
  return new Date(left.start_time).getTime() - new Date(right.start_time).getTime();
}

export default function PlannedMeetingsPage() {
  const { session } = useSession();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.token || session.user.role === "admin") {
      return;
    }

    const token = session.token;
    let disposed = false;

    async function loadMeetings() {
      try {
        const result = await fetchMyMeetings(token);
        if (disposed) {
          return;
        }
        setMeetings(result);
        setError(null);
      } catch (value) {
        if (disposed) {
          return;
        }
        const message =
          value instanceof ApiError ? value.message : "Unable to load planned meetings.";
        setError(message);
      }
    }

    function handleFocusRefresh() {
      void loadMeetings();
    }

    function handleVisibilityRefresh() {
      if (document.visibilityState === "visible") {
        void loadMeetings();
      }
    }

    void loadMeetings();
    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      disposed = true;
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [session?.token, session?.user.role]);

  const plannedMeetings = useMemo(
    () =>
      meetings
        .filter((meeting) => meeting.status === "confirmed")
        .slice()
        .sort(byStartTime),
    [meetings],
  );

  if (session?.user.role === "admin") {
    return (
      <div className="surface-card text-sm leading-6 text-[var(--muted)]">
        Switch to a student or ambassador demo user to view confirmed mentorship plans.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="surface-card">
        <div className="section-kicker">Confirmed mentorships</div>
        <h1 className="mt-5 text-4xl font-semibold text-[var(--ink)]">Planned meetings</h1>
        <p className="mt-4 text-base leading-7 text-[var(--muted)]">
          {session?.user.role === "ambassador"
            ? "Review the students you are scheduled to meet and keep the final details in one place."
            : "Track the ambassador sessions that have been confirmed for you, including format, time, and location."}
        </p>
      </section>

      {error ? <div className="surface-card text-sm text-[#8d2c30]">{error}</div> : null}

      {plannedMeetings.length ? (
        <section className="space-y-4">
          {plannedMeetings.map((meeting) => (
            <div key={meeting.id} className="space-y-2">
              <div className="px-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                {session?.user.role === "ambassador"
                  ? `Meeting with ${meeting.student_name}`
                  : `Meeting with ${meeting.ambassador_name}`}
              </div>
              <MeetingCard meeting={meeting} />
            </div>
          ))}
        </section>
      ) : (
        <div className="surface-card text-sm leading-6 text-[var(--muted)]">
          {session?.user.role === "ambassador"
            ? "Confirmed sessions will appear here after you approve student requests in Ambassador Desk."
            : "Confirmed sessions will appear here after an ambassador approves your booking request."}
        </div>
      )}
    </div>
  );
}
