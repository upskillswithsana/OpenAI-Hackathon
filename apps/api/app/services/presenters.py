from datetime import UTC, datetime

from app.models import AmbassadorProfile, AvailabilityRule, Meeting, User
from app.schemas.ambassadors import AmbassadorCard, AmbassadorDetail
from app.schemas.common import UserSummary
from app.schemas.meetings import MeetingResponse


DAY_NAMES = {
    0: "Mon",
    1: "Tue",
    2: "Wed",
    3: "Thu",
    4: "Fri",
    5: "Sat",
    6: "Sun",
}


def present_user(user: User) -> UserSummary:
    return UserSummary.model_validate(user)


def present_ambassador_card(user: User, profile: AmbassadorProfile) -> AmbassadorCard:
    return AmbassadorCard(
        user_id=user.id,
        name=user.name,
        email=user.email,
        program=profile.program,
        major=profile.major,
        graduation_year=profile.graduation_year,
        bio=profile.bio,
        interests=profile.interests,
        career_background=profile.career_background,
        linkedin=profile.linkedin,
        location=profile.location,
        country=profile.country,
        meeting_types=profile.meeting_types,
    )


def summarize_rules(rules: list[AvailabilityRule]) -> list[str]:
    grouped: dict[int, list[str]] = {}
    for rule in sorted(rules, key=lambda item: (item.day_of_week, item.start_time)):
        grouped.setdefault(rule.day_of_week, []).append(
            f"{rule.start_time.strftime('%I:%M %p')} - {rule.end_time.strftime('%I:%M %p')}"
        )
    return [f"{DAY_NAMES[day]}: {', '.join(times)}" for day, times in grouped.items()]


def present_ambassador_detail(user: User, profile: AmbassadorProfile) -> AmbassadorDetail:
    return AmbassadorDetail(
        **present_ambassador_card(user, profile).model_dump(),
        availability_summary=summarize_rules(profile.availability_rules),
    )


def present_meeting(meeting: Meeting) -> MeetingResponse:
    def normalize(value: datetime) -> datetime:
        return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)

    return MeetingResponse(
        id=meeting.id,
        student_id=meeting.student_id,
        ambassador_id=meeting.ambassador_id,
        start_time=normalize(meeting.start_time),
        end_time=normalize(meeting.end_time),
        status=meeting.status,
        meeting_type=meeting.meeting_type,
        location=meeting.location,
        meeting_link=meeting.meeting_link,
        notes=meeting.notes,
        created_at=normalize(meeting.created_at),
        student_name=meeting.student.name if meeting.student else "",
        ambassador_name=meeting.ambassador.name if meeting.ambassador else "",
    )
