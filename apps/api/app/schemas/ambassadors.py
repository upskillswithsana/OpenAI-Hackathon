from datetime import datetime, time

from pydantic import BaseModel, Field

from app.schemas.common import ApiModel


class AmbassadorCard(ApiModel):
    user_id: str
    name: str
    email: str
    program: str
    major: str
    graduation_year: int | None = None
    bio: str
    interests: list[str]
    career_background: str | None = None
    linkedin: str | None = None
    location: str | None = None
    country: str | None = None
    meeting_types: list[str]


class AmbassadorDetail(AmbassadorCard):
    availability_summary: list[str] = Field(default_factory=list)


class AvailabilitySlot(BaseModel):
    start_time: datetime
    end_time: datetime
    state: str
    reason: str | None = None


class AvailabilityWindowResponse(BaseModel):
    ambassador_id: str
    timezone: str
    slots: list[AvailabilitySlot]


class AvailabilityRuleInput(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time


class AvailabilityExceptionInput(BaseModel):
    starts_at: datetime
    ends_at: datetime
    reason: str | None = None
    is_available: bool = False


class AvailabilityRuleResponse(ApiModel):
    id: str
    day_of_week: int
    start_time: time
    end_time: time


class AvailabilityExceptionResponse(ApiModel):
    id: str
    starts_at: datetime
    ends_at: datetime
    reason: str | None = None
    is_available: bool


class AvailabilityConfigResponse(BaseModel):
    timezone: str
    rules: list[AvailabilityRuleResponse]
    exceptions: list[AvailabilityExceptionResponse]


class AvailabilityUpsertRequest(BaseModel):
    timezone: str | None = None
    rules: list[AvailabilityRuleInput]
    exceptions: list[AvailabilityExceptionInput] = Field(default_factory=list)

