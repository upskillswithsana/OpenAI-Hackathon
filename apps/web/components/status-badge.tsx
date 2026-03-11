import clsx from "clsx";

import type { MeetingStatus } from "@/lib/types";

const STATUS_STYLES: Record<MeetingStatus, string> = {
  pending: "bg-[#fff1c6] text-[#7a5400]",
  confirmed: "bg-[#dff5dc] text-[#1f6a38]",
  declined: "bg-[#ffdfe0] text-[#8d2c30]",
  cancelled: "bg-[#e7e8eb] text-[#525867]",
};

export function StatusBadge({ status }: { status: MeetingStatus }) {
  return (
    <span
      className={clsx(
        "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

