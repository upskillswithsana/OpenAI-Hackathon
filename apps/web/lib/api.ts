import type {
  AmbassadorCard,
  AmbassadorDetail,
  AskResponse,
  AvailabilityConfig,
  AvailabilityWindow,
  Meeting,
  UserSummary,
} from "@/lib/types";

// Local demo default: call FastAPI directly on host machine.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type RequestOptions = RequestInit & {
  token?: string | null;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { detail?: string };
      message = body.detail ?? message;
    } catch {
      // Ignore JSON parsing errors for non-JSON responses.
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export async function fetchDemoUsers(): Promise<UserSummary[]> {
  return request<UserSummary[]>("/auth/demo-users");
}

export async function loginDemoUser(email: string) {
  return request<{ access_token: string; token_type: string; user: UserSummary }>(
    "/auth/demo-login",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
  );
}

export async function askQuestion(token: string, question: string): Promise<AskResponse> {
  return request<AskResponse>("/ai/ask", {
    method: "POST",
    token,
    body: JSON.stringify({ question }),
  });
}

export async function fetchAmbassadors(token: string): Promise<AmbassadorCard[]> {
  return request<AmbassadorCard[]>("/ambassadors", { token });
}

export async function fetchAmbassador(token: string, id: string): Promise<AmbassadorDetail> {
  return request<AmbassadorDetail>(`/ambassadors/${id}`, { token });
}

export async function fetchAvailability(
  token: string,
  id: string,
  from: string,
  to: string,
): Promise<AvailabilityWindow> {
  const params = new URLSearchParams({ from, to });
  return request<AvailabilityWindow>(`/ambassadors/${id}/availability?${params.toString()}`, {
    token,
  });
}

export async function fetchMyMeetings(token: string): Promise<Meeting[]> {
  return request<Meeting[]>("/me/meetings", { token });
}

export async function createMeeting(
  token: string,
  body: {
    ambassador_id: string;
    start_time: string;
    duration_minutes: number;
    meeting_type: "virtual" | "in_person";
    location?: string | null;
    notes?: string | null;
  },
): Promise<Meeting> {
  return request<Meeting>("/meetings", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function updateMeetingStatus(
  token: string,
  meetingId: string,
  body: {
    status: "pending" | "confirmed" | "declined" | "cancelled";
    location?: string | null;
    notes?: string | null;
  },
): Promise<Meeting> {
  return request<Meeting>(`/meetings/${meetingId}/status`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export async function fetchMyAvailability(token: string): Promise<AvailabilityConfig> {
  return request<AvailabilityConfig>("/me/availability", { token });
}

export async function updateMyAvailability(
  token: string,
  body: AvailabilityConfig,
): Promise<AvailabilityConfig> {
  return request<AvailabilityConfig>("/me/availability", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function uploadKnowledge(
  token: string,
  formData: FormData,
): Promise<{ document_id: string; title: string; source: string | null; chunk_count: number }> {
  const response = await fetch(`${API_BASE_URL}/admin/knowledge/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { detail?: string };
      message = body.detail ?? message;
    } catch {
      // Ignore JSON parsing errors for non-JSON responses.
    }
    throw new ApiError(message, response.status);
  }

  return response.json();
}
