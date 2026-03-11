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

const DEFAULT_BLOCK_REASON = "Unavailable";
const DEFAULT_BLOCK_START_TIME = "13:30";
const DEFAULT_BLOCK_END_TIME = "14:30";

const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

type BlockDraft = {
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
};

type RuleDraft = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

function createBlockDraft(): BlockDraft {
  return {
    date: "",
    startTime: DEFAULT_BLOCK_START_TIME,
    endTime: DEFAULT_BLOCK_END_TIME,
    reason: DEFAULT_BLOCK_REASON,
  };
}

function createRuleDraft(): RuleDraft {
  return {
    day_of_week: 0,
    start_time: "09:00",
    end_time: "10:00",
  };
}

function getTodayDateValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function formatBlockedDate(date: string) {
  return fullDateFormatter.format(new Date(`${date}T12:00`));
}

function formatBlockedSummary(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return `${timeFormatter.format(start)} to ${timeFormatter.format(end)}`;
}

function normalizeAvailabilityConfig(config: AvailabilityConfig): AvailabilityConfig {
  return {
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
  };
}

function toAvailabilityPayload(config: AvailabilityConfig): AvailabilityConfig {
  return {
    timezone: config.timezone,
    rules: config.rules.map((rule) => ({
      ...rule,
      start_time: rule.start_time.length === 5 ? `${rule.start_time}:00` : rule.start_time,
      end_time: rule.end_time.length === 5 ? `${rule.end_time}:00` : rule.end_time,
    })),
    exceptions: config.exceptions,
  };
}

export default function AmbassadorDashboardPage() {
  const { session } = useSession();
  const [availability, setAvailability] = useState<AvailabilityConfig>(DEFAULT_CONFIG);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [blockDraft, setBlockDraft] = useState<BlockDraft>(createBlockDraft());
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [ruleDraft, setRuleDraft] = useState<RuleDraft>(createRuleDraft());
  const todayDate = getTodayDateValue();

  useEffect(() => {
    if (!session?.token || session.user.role !== "ambassador") {
      return;
    }
    void Promise.all([fetchMyAvailability(session.token), fetchMyMeetings(session.token)])
      .then(([config, list]) => {
        setAvailability(normalizeAvailabilityConfig(config));
        setMeetings(list);
      })
      .catch((value) => {
        const detail = value instanceof ApiError ? value.message : "Unable to load ambassador data.";
        setError(detail);
      });
  }, [session?.token, session?.user.role]);

  async function persistAvailability(nextAvailability: AvailabilityConfig, successMessage: string) {
    if (!session?.token) {
      return false;
    }
    try {
      const saved = await updateMyAvailability(session.token, toAvailabilityPayload(nextAvailability));
      setAvailability(normalizeAvailabilityConfig(saved));
      setMessage(successMessage);
      setError(null);
      return true;
    } catch (value) {
      const detail = value instanceof ApiError ? value.message : "Unable to save availability.";
      setError(detail);
      return false;
    }
  }

  async function saveAvailability() {
    await persistAvailability(availability, "Availability saved.");
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

  function confirmRuleDraft() {
    if (ruleDraft.end_time <= ruleDraft.start_time) {
      setError("Rule end time must be after the start time.");
      return;
    }

    const nextAvailability = {
      ...availability,
      rules: [...availability.rules, ruleDraft].sort((left, right) => {
        if (left.day_of_week !== right.day_of_week) {
          return left.day_of_week - right.day_of_week;
        }
        return left.start_time.localeCompare(right.start_time);
      }),
    };

    void persistAvailability(nextAvailability, "Weekly rule added.").then((saved) => {
      if (!saved) {
        return;
      }
      setIsAddingRule(false);
      setRuleDraft(createRuleDraft());
    });
  }

  function addBlockedDay() {
    if (!blockDraft.date || !blockDraft.startTime || !blockDraft.endTime) {
      setError("Choose a day plus both start and end times before adding the block.");
      return;
    }
    if (blockDraft.date < todayDate) {
      setError("Blocked dates cannot be earlier than today.");
      return;
    }

    const startsAt = `${blockDraft.date}T${blockDraft.startTime}`;
    const endsAt = `${blockDraft.date}T${blockDraft.endTime}`;

    if (endsAt <= startsAt) {
      setError("Blocked end time must be after the start time.");
      return;
    }

    setAvailability((current) => ({
      ...current,
      exceptions: [
        ...current.exceptions,
        {
          starts_at: startsAt,
          ends_at: endsAt,
          reason: blockDraft.reason.trim() || DEFAULT_BLOCK_REASON,
          is_available: false,
        },
      ].sort((left, right) => left.starts_at.localeCompare(right.starts_at)),
    }));
    setIsAddingBlock(false);
    setBlockDraft(createBlockDraft());
    setMessage(
      `Blocked ${formatBlockedDate(blockDraft.date)} from ${formatBlockedSummary(startsAt, endsAt)}.`,
    );
    setError(null);
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
              onClick={() => {
                setIsAddingRule((current) => !current);
                setRuleDraft(createRuleDraft());
                setError(null);
              }}
              className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)]"
            >
              {isAddingRule ? "Cancel" : "Add rule"}
            </button>
          </div>

          <div className="space-y-3">
            {isAddingRule ? (
              <div className="grid gap-3 rounded-[22px] border border-[var(--line)] bg-white/75 p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
                <select
                  value={ruleDraft.day_of_week}
                  onChange={(event) =>
                    setRuleDraft((current) => ({
                      ...current,
                      day_of_week: Number(event.target.value),
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
                  value={ruleDraft.start_time}
                  onChange={(event) =>
                    setRuleDraft((current) => ({
                      ...current,
                      start_time: event.target.value,
                    }))
                  }
                  className="rounded-[16px] border border-[var(--line)] bg-white px-3 py-2 text-sm"
                />
                <input
                  type="time"
                  value={ruleDraft.end_time}
                  onChange={(event) =>
                    setRuleDraft((current) => ({
                      ...current,
                      end_time: event.target.value,
                    }))
                  }
                  className="rounded-[16px] border border-[var(--line)] bg-white px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={confirmRuleDraft}
                  className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent)]"
                >
                  Add rule
                </button>
              </div>
            ) : null}

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
              onClick={() => {
                setIsAddingBlock((current) => !current);
                setBlockDraft(createBlockDraft());
                setError(null);
              }}
              className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)]"
            >
              {isAddingBlock ? "Cancel" : "Add block"}
            </button>
          </div>

          {isAddingBlock ? (
            <div className="rounded-[24px] border border-[var(--line)] bg-white/80 p-5">
              <div className="section-kicker">Single-day block</div>
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                Choose one date first. Then define the blocked start and end time for that day.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="block text-sm font-semibold text-[var(--ink)]">Blocked date</span>
                  <input
                    type="date"
                    value={blockDraft.date}
                    min={todayDate}
                    onChange={(event) =>
                      setBlockDraft((current) => ({
                        ...current,
                        date: event.target.value,
                        startTime: DEFAULT_BLOCK_START_TIME,
                        endTime: DEFAULT_BLOCK_END_TIME,
                      }))
                    }
                    className="w-full rounded-[16px] border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
                  />
                </label>

                {blockDraft.date ? (
                  <div className="rounded-[18px] border border-[var(--line)] bg-[var(--paper-strong)] px-4 py-4 text-sm text-[var(--muted)]">
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      Selected day
                    </div>
                    <div className="mt-2 text-base font-semibold text-[var(--ink)]">
                      {formatBlockedDate(blockDraft.date)}
                    </div>
                  </div>
                ) : null}
              </div>

              {blockDraft.date ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="block text-sm font-semibold text-[var(--ink)]">Start time</span>
                    <input
                      type="time"
                      value={blockDraft.startTime}
                      onChange={(event) =>
                        setBlockDraft((current) => ({
                          ...current,
                          startTime: event.target.value,
                        }))
                      }
                      className="w-full rounded-[16px] border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="block text-sm font-semibold text-[var(--ink)]">End time</span>
                    <input
                      type="time"
                      value={blockDraft.endTime}
                      onChange={(event) =>
                        setBlockDraft((current) => ({
                          ...current,
                          endTime: event.target.value,
                        }))
                      }
                      className="w-full rounded-[16px] border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
                    />
                  </label>

                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={addBlockedDay}
                      className="w-full rounded-[16px] bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)]"
                    >
                      Block time
                    </button>
                  </div>
                </div>
              ) : null}

              {blockDraft.date && blockDraft.startTime && blockDraft.endTime ? (
                <div className="mt-5 space-y-4">
                  <label className="space-y-2">
                    <span className="block text-sm font-semibold text-[var(--ink)]">Description</span>
                    <input
                      value={blockDraft.reason}
                      onChange={(event) =>
                        setBlockDraft((current) => ({
                          ...current,
                          reason: event.target.value,
                        }))
                      }
                      placeholder="Unavailable"
                      className="w-full rounded-[16px] border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
                    />
                  </label>

                  <div className="rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      Block summary
                    </div>
                    <div className="mt-2 text-lg font-semibold text-[var(--ink)]">
                      {formatBlockedDate(blockDraft.date)}
                    </div>
                    <div className="mt-1 text-sm font-medium text-[var(--ink)]">
                      {formatBlockedSummary(
                        `${blockDraft.date}T${blockDraft.startTime}`,
                        `${blockDraft.date}T${blockDraft.endTime}`,
                      )}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      Description: {blockDraft.reason.trim() || DEFAULT_BLOCK_REASON}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3">
            {availability.exceptions.length ? (
              availability.exceptions.map((exception, index) => (
                <div
                  key={`${exception.starts_at}-${index}`}
                  className="rounded-[22px] border border-[var(--line)] bg-white/75 p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                        Blocked day
                      </div>
                      <div className="mt-2 text-xl font-semibold text-[var(--ink)]">
                        {formatBlockedDate(exception.starts_at.slice(0, 10))}
                      </div>
                      <div className="mt-1 text-sm font-medium text-[var(--ink)]">
                        {formatBlockedSummary(exception.starts_at, exception.ends_at)}
                      </div>
                    </div>

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

                  <div className="mt-4 rounded-[18px] bg-[var(--paper-strong)] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      Description
                    </div>
                    <div className="mt-2 text-sm font-medium text-[var(--ink)]">
                      {exception.reason?.trim() || DEFAULT_BLOCK_REASON}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-[var(--line)] bg-white/60 px-4 py-5 text-sm leading-6 text-[var(--muted)]">
                No blocked days yet. Add one day at a time and save when you are done.
              </div>
            )}
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
