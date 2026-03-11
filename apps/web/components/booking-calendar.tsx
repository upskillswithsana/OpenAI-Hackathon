"use client";

import FullCalendar from "@fullcalendar/react";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";

import type { AvailabilitySlot } from "@/lib/types";

const COLOR_BY_STATE = {
  available: "#53a05e",
  pending: "#d0a625",
  booked: "#767b87",
  blocked: "#767b87",
} as const;

export function BookingCalendar({
  slots,
  selectedSlot,
  onSelectSlot,
}: {
  slots: AvailabilitySlot[];
  selectedSlot: string | null;
  onSelectSlot: (value: string) => void;
}) {
  const events = slots.map((slot) => ({
    id: slot.start_time,
    title: slot.state,
    start: slot.start_time,
    end: slot.end_time,
    backgroundColor: COLOR_BY_STATE[slot.state],
    borderColor: slot.start_time === selectedSlot ? "#111315" : COLOR_BY_STATE[slot.state],
    textColor: "#ffffff",
    extendedProps: {
      state: slot.state,
      reason: slot.reason,
    },
  }));

  return (
    <div className="surface-card overflow-hidden p-0">
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        allDaySlot={false}
        slotDuration="00:30:00"
        slotLabelFormat={{
          hour: "numeric",
          minute: "2-digit",
          meridiem: "short",
        }}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "timeGridWeek,timeGridDay",
        }}
        height="auto"
        events={events}
        eventClick={(info) => {
          if (info.event.extendedProps.state === "available") {
            onSelectSlot(info.event.startStr);
          }
        }}
      />
    </div>
  );
}

