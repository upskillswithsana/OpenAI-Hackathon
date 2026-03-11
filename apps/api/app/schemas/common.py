from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models import MeetingStatus, MeetingType, UserRole


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)


class UserSummary(ApiModel):
    id: str
    name: str
    email: str
    role: UserRole


class MeetingSummary(ApiModel):
    id: str
    student_id: str
    ambassador_id: str
    start_time: datetime
    end_time: datetime
    status: MeetingStatus
    meeting_type: MeetingType
    location: str | None = None
    meeting_link: str | None = None
    notes: str | None = None
    created_at: datetime

