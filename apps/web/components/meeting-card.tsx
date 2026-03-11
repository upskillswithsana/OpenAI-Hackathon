import { StatusBadge } from "@/components/status-badge";
import type { Meeting } from "@/lib/types";

const formatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function MeetingCard({
  meeting,
  actions,
}: {
  meeting: Meeting;
  actions?: React.ReactNode;
}) {
  return (
    <article className="surface-card flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-[var(--ink)]">
            {meeting.student_name} ↔ {meeting.ambassador_name}
          </p>
          <p className="text-sm text-[var(--muted)]">
            {formatter.format(new Date(meeting.start_time))} to{" "}
            {formatter.format(new Date(meeting.end_time))}
          </p>
        </div>
        <StatusBadge status={meeting.status} />
      </div>
      <div className="flex flex-wrap gap-3 text-sm text-[var(--muted)]">
        <span>Format: {meeting.meeting_type.replace("_", " ")}</span>
        {meeting.location ? <span>Location: {meeting.location}</span> : null}
        {meeting.meeting_link ? (
          <a
            className="font-medium text-[var(--accent)] underline-offset-4 hover:underline"
            href={meeting.meeting_link}
            target="_blank"
            rel="noreferrer"
          >
            Demo meeting link
          </a>
        ) : null}
      </div>
      {meeting.notes ? <p className="text-sm text-[var(--ink)]">{meeting.notes}</p> : null}
      {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
    </article>
  );
}

