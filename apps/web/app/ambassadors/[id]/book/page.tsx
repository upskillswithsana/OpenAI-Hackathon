"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { BookingCalendar } from "@/components/booking-calendar";
import { MeetingCard } from "@/components/meeting-card";
import { useSession } from "@/components/session-provider";
import { ApiError, createMeeting, fetchAmbassador, fetchAvailability } from "@/lib/api";
import type { AmbassadorDetail, AvailabilityWindow, Meeting, MeetingType } from "@/lib/types";

function rangeForCalendar() {
  const start = new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + 14);
  return { start, end };
}

export default function BookingPage() {
  const params = useParams<{ id: string }>();
  const { session } = useSession();
  const [ambassador, setAmbassador] = useState<AmbassadorDetail | null>(null);
  const [availability, setAvailability] = useState<AvailabilityWindow | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [duration, setDuration] = useState(30);
  const [meetingType, setMeetingType] = useState<MeetingType>("virtual");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Meeting | null>(null);

  useEffect(() => {
    if (!session?.token || !params.id) {
      return;
    }
    const { start, end } = rangeForCalendar();
    void Promise.all([
      fetchAmbassador(session.token, params.id),
      fetchAvailability(session.token, params.id, start.toISOString(), end.toISOString()),
    ])
      .then(([detail, window]) => {
        setAmbassador(detail);
        setAvailability(window);
        const firstAvailable = window.slots.find((slot) => slot.state === "available");
        setSelectedSlot(firstAvailable?.start_time ?? null);
      })
      .catch((value) => {
        const message = value instanceof ApiError ? value.message : "Unable to load booking data.";
        setError(message);
      });
  }, [params.id, session?.token]);

  const selectedPreview = useMemo(() => {
    if (!selectedSlot) {
      return null;
    }
    const start = new Date(selectedSlot);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + duration);
    return { start, end };
  }, [duration, selectedSlot]);

  async function handleBooking() {
    if (!session?.token || !selectedSlot || !ambassador) {
      return;
    }
    try {
      setError(null);
      const meeting = await createMeeting(session.token, {
        ambassador_id: ambassador.user_id,
        start_time: selectedSlot,
        duration_minutes: duration,
        meeting_type: meetingType,
        location: meetingType === "in_person" ? location : undefined,
        notes: notes || undefined,
      });
      setSuccess(meeting);
    } catch (value) {
      const message = value instanceof ApiError ? value.message : "Unable to create meeting request.";
      setError(message);
    }
  }

  if (error && !ambassador && !availability) {
    return <div className="surface-card text-sm text-[#8d2c30]">{error}</div>;
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="space-y-6">
        <div className="surface-card">
          <div className="section-kicker">Booking calendar</div>
          <h1 className="mt-5 text-4xl font-semibold text-[var(--ink)]">
            {ambassador ? `Book ${ambassador.name}` : "Book a mentorship session"}
          </h1>
          <p className="mt-4 text-base leading-7 text-[var(--muted)]">
            Available slots are green, pending requests are yellow, and blocked or confirmed times
            are grey.
          </p>
        </div>

        {availability ? (
          <BookingCalendar
            slots={availability.slots}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
          />
        ) : (
          <div className="surface-card text-sm text-[var(--muted)]">Loading calendar...</div>
        )}
      </section>

      <aside className="space-y-6">
        <div className="surface-card space-y-5">
          <div className="section-kicker">Request details</div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--ink)]">Duration</label>
            <div className="flex gap-3">
              {[30, 60].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDuration(value)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    duration === value
                      ? "bg-[var(--ink)] text-white"
                      : "border border-[var(--line)] bg-white text-[var(--ink)]"
                  }`}
                >
                  {value} min
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--ink)]">Meeting type</label>
            <select
              value={meetingType}
              onChange={(event) => setMeetingType(event.target.value as MeetingType)}
              className="w-full rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
            >
              {ambassador?.meeting_types.map((type) => (
                <option key={type} value={type}>
                  {type.replace("_", " ")}
                </option>
              )) ?? <option value="virtual">virtual</option>}
            </select>
          </div>

          {meetingType === "in_person" ? (
            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--ink)]">
                Campus location
              </label>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="McCombs atrium, PCL lobby..."
                className="w-full rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
              />
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--ink)]">Notes</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What do you want help with?"
              className="min-h-28 w-full rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
            />
          </div>

          {selectedPreview ? (
            <div className="rounded-[22px] bg-white/75 px-4 py-4 text-sm text-[var(--muted)]">
              Selected start: {selectedPreview.start.toLocaleString()}
              <br />
              Selected end: {selectedPreview.end.toLocaleString()}
            </div>
          ) : (
            <div className="rounded-[22px] bg-white/75 px-4 py-4 text-sm text-[var(--muted)]">
              Select a green slot from the calendar.
            </div>
          )}

          {error ? (
            <div className="rounded-[20px] bg-[#ffe7e5] px-4 py-3 text-sm text-[#8d2c30]">{error}</div>
          ) : null}

          <button
            type="button"
            onClick={() => void handleBooking()}
            disabled={!selectedSlot || session?.user.role !== "student"}
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Submit booking request
          </button>

          {session?.user.role !== "student" ? (
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
              Switch to a student demo user to request a meeting.
            </p>
          ) : null}
        </div>

        {success ? <MeetingCard meeting={success} /> : null}
      </aside>
    </div>
  );
}

