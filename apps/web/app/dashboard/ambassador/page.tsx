"use client";

import { useEffect, useState } from "react";

import { MeetingCard } from "@/components/meeting-card";
import { useSession } from "@/components/session-provider";
import {
  ApiError,
  fetchMyAvailability,
  fetchMyMeetings,
  updateMeetingStatus,
  updateMyAvailability,
} from "@/lib/api";
import type { AvailabilityConfig, Meeting } from "@/lib/types";

const DAY_OPTIONS = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

const DEFAULT_CONFIG: AvailabilityConfig = {
  timezone: "America/Chicago",
  rules: [{ day_of_week: 1, start_time: "09:00:00", end_time: "12:00:00" }],
  exceptions: [],
};

export default function AmbassadorDashboardPage() {
  const { session } = useSession();
  const [availability, setAvailability] = useState<AvailabilityConfig>(DEFAULT_CONFIG);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.token || session.user.role !== "ambassador") {
      return;
    }
    void Promise.all([fetchMyAvailability(session.token), fetchMyMeetings(session.token)])
      .then(([config, list]) => {
        setAvailability({
          timezone: config.timezone,
          rules: config.rules.map((rule) => ({
            ...rule,
            start_time: rule.start_time.slice(0, 5),
            end_time: rule.end_time.slice(0, 5),
          })),
          exceptions: config.exceptions.map((exception) => ({
            ...exception,
            starts_at: exception.starts_at.slice(0, 16),
            ends_at: exception.ends_at.slice(0, 16),
          })),
        });
        setMeetings(list);
      })
      .catch((value) => {
        const detail = value instanceof ApiError ? value.message : "Unable to load ambassador data.";
        setError(detail);
      });
  }, [session?.token, session?.user.role]);

  async function saveAvailability() {
    if (!session?.token) {
      return;
    }
    try {
      const saved = await updateMyAvailability(session.token, {
        timezone: availability.timezone,
        rules: availability.rules.map((rule) => ({
          ...rule,
          start_time: rule.start_time.length === 5 ? `${rule.start_time}:00` : rule.start_time,
          end_time: rule.end_time.length === 5 ? `${rule.end_time}:00` : rule.end_time,
        })),
        exceptions: availability.exceptions,
      });
      setAvailability({
        timezone: saved.timezone,
        rules: saved.rules.map((rule) => ({
          ...rule,
          start_time: rule.start_time.slice(0, 5),
          end_time: rule.end_time.slice(0, 5),
        })),
        exceptions: saved.exceptions.map((exception) => ({
          ...exception,
          starts_at: exception.starts_at.slice(0, 16),
          ends_at: exception.ends_at.slice(0, 16),
        })),
      });
      setMessage("Availability saved.");
      setError(null);
    } catch (value) {
      const detail = value instanceof ApiError ? value.message : "Unable to save availability.";
      setError(detail);
    }
  }

  async function handleMeetingAction(meetingId: string, status: Meeting["status"]) {
    if (!session?.token) {
      return;
    }
    try {
      const updated = await updateMeetingStatus(session.token, meetingId, { status });
      setMeetings((current) => current.map((meeting) => (meeting.id === meetingId ? updated : meeting)));
      setMessage(`Meeting ${status}.`);
      setError(null);
    } catch (value) {
      const detail = value instanceof ApiError ? value.message : "Unable to update meeting.";
      setError(detail);
    }
  }

  if (session?.user.role !== "ambassador") {
    return (
      <div className="surface-card text-sm leading-6 text-[var(--muted)]">
        Switch to an ambassador demo user to manage availability and respond to meeting requests.
      </div>
    );
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="space-y-6">
        <div className="surface-card">
          <div className="section-kicker">Weekly availability</div>
          <h1 className="mt-5 text-4xl font-semibold text-[var(--ink)]">Ambassador desk</h1>
          <p className="mt-4 text-base leading-7 text-[var(--muted)]">
            Publish recurring office hours, block unavailable times, and confirm mentorship requests.
          </p>
        </div>

        <div className="surface-card space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--ink)]">Weekly rules</h2>
            <button
              type="button"
              onClick={() =>
                setAvailability((current) => ({
                  ...current,
                  rules: [...current.rules, { day_of_week: 0, start_time: "09:00", end_time: "10:00" }],
                }))
              }
              className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)]"
            >
              Add rule
            </button>
          </div>

          <div className="space-y-3">
            {availability.rules.map((rule, index) => (
              <div key={`${rule.day_of_week}-${index}`} className="grid gap-3 rounded-[22px] border border-[var(--line)] bg-white/75 p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
                <select
                  value={rule.day_of_week}
                  onChange={(event) =>
                    setAvailability((current) => ({
                      ...current,
                      rules: current.rules.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, day_of_week: Number(event.target.value) } : item,
                      ),
                    }))
                  }
                  className="rounded-[16px] border border-[var(--line)] bg-white px-3 py-2 text-sm"
                >
                  {DAY_OPTIONS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={rule.start_time}
                  onChange={(event) =>
                    setAvailability((current) => ({
                      ...current,
                      rules: current.rules.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, start_time: event.target.value } : item,
                      ),
                    }))
                  }
                  className="rounded-[16px] border border-[var(--line)] bg-white px-3 py-2 text-sm"
                />
                <input
                  type="time"
                  value={rule.end_time}
                  onChange={(event) =>
                    setAvailability((current) => ({
                      ...current,
                      rules: current.rules.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, end_time: event.target.value } : item,
                      ),
                    }))
                  }
                  className="rounded-[16px] border border-[var(--line)] bg-white px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    setAvailability((current) => ({
                      ...current,
                      rules: current.rules.filter((_, itemIndex) => itemIndex !== index),
                    }))
                  }
                  className="rounded-full bg-[#f2e2d4] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--ink)]">Blocked times</h2>
            <button
              type="button"
              onClick={() =>
                setAvailability((current) => ({
                  ...current,
                  exceptions: [
                    ...current.exceptions,
                    {
                      starts_at: new Date().toISOString().slice(0, 16),
                      ends_at: new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16),
                      reason: "Unavailable",
                      is_available: false,
                    },
                  ],
                }))
              }
              className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)]"
            >
              Add block
            </button>
          </div>

          <div className="space-y-3">
            {availability.exceptions.map((exception, index) => (
              <div key={`${exception.starts_at}-${index}`} className="grid gap-3 rounded-[22px] border border-[var(--line)] bg-white/75 p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
                <input
                  type="datetime-local"
                  value={exception.starts_at}
                  onChange={(event) =>
                    setAvailability((current) => ({
                      ...current,
                      exceptions: current.exceptions.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, starts_at: event.target.value } : item,
                      ),
                    }))
                  }
                  className="rounded-[16px] border border-[var(--line)] bg-white px-3 py-2 text-sm"
                />
                <input
                  type="datetime-local"
                  value={exception.ends_at}
                  onChange={(event) =>
                    setAvailability((current) => ({
                      ...current,
                      exceptions: current.exceptions.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, ends_at: event.target.value } : item,
                      ),
                    }))
                  }
                  className="rounded-[16px] border border-[var(--line)] bg-white px-3 py-2 text-sm"
                />
                <input
                  value={exception.reason ?? ""}
                  onChange={(event) =>
                    setAvailability((current) => ({
                      ...current,
                      exceptions: current.exceptions.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, reason: event.target.value } : item,
                      ),
                    }))
                  }
                  placeholder="Reason"
                  className="rounded-[16px] border border-[var(--line)] bg-white px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    setAvailability((current) => ({
                      ...current,
                      exceptions: current.exceptions.filter((_, itemIndex) => itemIndex !== index),
                    }))
                  }
                  className="rounded-full bg-[#f2e2d4] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void saveAvailability()}
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--ink)]"
          >
            Save availability
          </button>

          {message ? <p className="text-sm text-[#1f6a38]">{message}</p> : null}
          {error ? <p className="text-sm text-[#8d2c30]">{error}</p> : null}
        </div>
      </section>

      <section className="space-y-5">
        <div className="surface-card">
          <div className="section-kicker">Meeting requests</div>
          <h2 className="mt-5 text-3xl font-semibold text-[var(--ink)]">Upcoming and pending</h2>
        </div>

        {meetings.length ? (
          meetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              actions={
                <>
                  {meeting.status === "pending" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleMeetingAction(meeting.id, "confirmed")}
                        className="rounded-full bg-[var(--green)] px-4 py-2 text-sm font-semibold text-white"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleMeetingAction(meeting.id, "declined")}
                        className="rounded-full bg-[#8d2c30] px-4 py-2 text-sm font-semibold text-white"
                      >
                        Decline
                      </button>
                    </>
                  ) : null}
                  {meeting.status === "confirmed" ? (
                    <button
                      type="button"
                      onClick={() => void handleMeetingAction(meeting.id, "cancelled")}
                      className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)]"
                    >
                      Cancel
                    </button>
                  ) : null}
                </>
              }
            />
          ))
        ) : (
          <div className="surface-card text-sm text-[var(--muted)]">
            No meetings yet. Once students book time, requests will appear here.
          </div>
        )}
      </section>
    </div>
  );
}

