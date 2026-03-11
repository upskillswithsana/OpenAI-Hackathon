from datetime import datetime

from pydantic import BaseModel, Field

from app.models import MeetingStatus, MeetingType
from app.schemas.common import MeetingSummary


class MeetingCreateRequest(BaseModel):
    ambassador_id: str
    start_time: datetime
    duration_minutes: int = Field(default=30)
    meeting_type: MeetingType
    location: str | None = None
    notes: str | None = None


class MeetingStatusUpdateRequest(BaseModel):
    status: MeetingStatus
    location: str | None = None
    notes: str | None = None


class MeetingResponse(MeetingSummary):
    student_name: str
    ambassador_name: str

