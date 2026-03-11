export type UserRole = "student" | "ambassador" | "admin";

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type AmbassadorCard = {
  user_id: string;
  name: string;
  email: string;
  program: string;
  major: string;
  graduation_year: number | null;
  bio: string;
  interests: string[];
  career_background: string | null;
  linkedin: string | null;
  location: string | null;
  country: string | null;
  meeting_types: string[];
};

export type AmbassadorDetail = AmbassadorCard & {
  availability_summary: string[];
};

export type Citation = {
  title: string;
  source: string | null;
  snippet: string;
};

export type AskResponse = {
  answer: string;
  citations: Citation[];
  suggested_ambassadors: AmbassadorCard[];
};

export type AvailabilityRule = {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export type AvailabilityException = {
  id?: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  is_available: boolean;
};

export type AvailabilityConfig = {
  timezone: string;
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
};

export type AvailabilitySlot = {
  start_time: string;
  end_time: string;
  state: "available" | "pending" | "booked" | "blocked";
  reason: string | null;
};

export type AvailabilityWindow = {
  ambassador_id: string;
  timezone: string;
  slots: AvailabilitySlot[];
};

export type MeetingType = "virtual" | "in_person";
export type MeetingStatus = "pending" | "confirmed" | "declined" | "cancelled";

export type Meeting = {
  id: string;
  student_id: string;
  ambassador_id: string;
  start_time: string;
  end_time: string;
  status: MeetingStatus;
  meeting_type: MeetingType;
  location: string | null;
  meeting_link: string | null;
  notes: string | null;
  created_at: string;
  student_name: string;
  ambassador_name: string;
};

