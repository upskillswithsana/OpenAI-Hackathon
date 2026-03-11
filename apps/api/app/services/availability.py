from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import and_, delete, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.models import (
    AmbassadorProfile,
    AvailabilityException,
    AvailabilityRule,
    Meeting,
    MeetingStatus,
    MeetingType,
    User,
    UserRole,
)
from app.schemas.ambassadors import (
    AvailabilityConfigResponse,
    AvailabilityExceptionInput,
    AvailabilityExceptionResponse,
    AvailabilityRuleInput,
    AvailabilityRuleResponse,
    AvailabilitySlot,
    AvailabilityUpsertRequest,
    AvailabilityWindowResponse,
)


SLOT_MINUTES = 30


class SchedulingService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.timezone = ZoneInfo(self.settings.default_timezone)

    def _to_utc(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            value = value.replace(tzinfo=self.timezone)
        return value.astimezone(UTC)

    def _normalize_stored_datetime(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)

    def _slot_state(
        self,
        slot_start: datetime,
        slot_end: datetime,
        meetings: list[Meeting],
        exceptions: list[AvailabilityException],
    ) -> tuple[str, str | None]:
        for exception in exceptions:
            starts_at = self._normalize_stored_datetime(exception.starts_at)
            ends_at = self._normalize_stored_datetime(exception.ends_at)
            if starts_at < slot_end and ends_at > slot_start:
                if exception.is_available:
                    continue
                return ("blocked", exception.reason or "Unavailable")

        for meeting in meetings:
            meeting_start = self._normalize_stored_datetime(meeting.start_time)
            meeting_end = self._normalize_stored_datetime(meeting.end_time)
            if meeting_start < slot_end and meeting_end > slot_start:
                if meeting.status == MeetingStatus.pending:
                    return ("pending", "Pending request")
                if meeting.status == MeetingStatus.confirmed:
                    return ("booked", "Booked")

        return ("available", None)

    def get_availability_window(
        self,
        db: Session,
        ambassador_id: str,
        range_start: datetime,
        range_end: datetime,
    ) -> AvailabilityWindowResponse:
        range_start_utc = self._to_utc(range_start)
        range_end_utc = self._to_utc(range_end)

        rules = db.scalars(
            select(AvailabilityRule).where(AvailabilityRule.ambassador_id == ambassador_id)
        ).all()
        exceptions = db.scalars(
            select(AvailabilityException).where(
                AvailabilityException.ambassador_id == ambassador_id,
                AvailabilityException.ends_at > range_start_utc,
                AvailabilityException.starts_at < range_end_utc,
            )
        ).all()
        meetings = db.scalars(
            select(Meeting).where(
                Meeting.ambassador_id == ambassador_id,
                Meeting.status.in_([MeetingStatus.pending, MeetingStatus.confirmed]),
                Meeting.end_time > range_start_utc,
                Meeting.start_time < range_end_utc,
            )
        ).all()

        slots: list[AvailabilitySlot] = []
        local_start = range_start_utc.astimezone(self.timezone)
        local_end = range_end_utc.astimezone(self.timezone)
        current_day = local_start.date()
        final_day = local_end.date()
        slot_delta = timedelta(minutes=SLOT_MINUTES)

        while current_day <= final_day:
            day_rules = [rule for rule in rules if rule.day_of_week == current_day.weekday()]
            for rule in day_rules:
                local_rule_start = datetime.combine(current_day, rule.start_time, self.timezone)
                local_rule_end = datetime.combine(current_day, rule.end_time, self.timezone)
                cursor = local_rule_start
                while cursor + slot_delta <= local_rule_end:
                    slot_start_utc = cursor.astimezone(UTC)
                    slot_end_utc = (cursor + slot_delta).astimezone(UTC)
                    cursor += slot_delta

                    if slot_end_utc <= range_start_utc or slot_start_utc >= range_end_utc:
                        continue

                    state, reason = self._slot_state(slot_start_utc, slot_end_utc, meetings, exceptions)
                    slots.append(
                        AvailabilitySlot(
                            start_time=slot_start_utc,
                            end_time=slot_end_utc,
                            state=state,
                            reason=reason,
                        )
                    )
            current_day += timedelta(days=1)

        slots.sort(key=lambda item: item.start_time)
        return AvailabilityWindowResponse(
            ambassador_id=ambassador_id,
            timezone=self.settings.default_timezone,
            slots=slots,
        )

    def get_availability_config(self, db: Session, ambassador_id: str) -> AvailabilityConfigResponse:
        rules = db.scalars(
            select(AvailabilityRule)
            .where(AvailabilityRule.ambassador_id == ambassador_id)
            .order_by(AvailabilityRule.day_of_week, AvailabilityRule.start_time)
        ).all()
        exceptions = db.scalars(
            select(AvailabilityException)
            .where(AvailabilityException.ambassador_id == ambassador_id)
            .order_by(AvailabilityException.starts_at)
        ).all()

        return AvailabilityConfigResponse(
            timezone=self.settings.default_timezone,
            rules=[AvailabilityRuleResponse.model_validate(rule) for rule in rules],
            exceptions=[
                AvailabilityExceptionResponse.model_validate(exception) for exception in exceptions
            ],
        )

    def update_availability(
        self,
        db: Session,
        ambassador_id: str,
        payload: AvailabilityUpsertRequest,
    ) -> AvailabilityConfigResponse:
        for rule in payload.rules:
            if rule.end_time <= rule.start_time:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Availability end time must be after start time.",
                )
        for exception in payload.exceptions:
            if exception.ends_at <= exception.starts_at:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Availability exception end time must be after start time.",
                )

        db.execute(delete(AvailabilityRule).where(AvailabilityRule.ambassador_id == ambassador_id))
        db.execute(
            delete(AvailabilityException).where(AvailabilityException.ambassador_id == ambassador_id)
        )

        for rule in payload.rules:
            db.add(
                AvailabilityRule(
                    ambassador_id=ambassador_id,
                    day_of_week=rule.day_of_week,
                    start_time=rule.start_time,
                    end_time=rule.end_time,
                )
            )

        for exception in payload.exceptions:
            db.add(
                AvailabilityException(
                    ambassador_id=ambassador_id,
                    starts_at=self._to_utc(exception.starts_at),
                    ends_at=self._to_utc(exception.ends_at),
                    reason=exception.reason,
                    is_available=exception.is_available,
                )
            )

        db.commit()
        return self.get_availability_config(db, ambassador_id)

    def _is_slot_range_available(
        self,
        db: Session,
        ambassador_id: str,
        start_time: datetime,
        duration_minutes: int,
    ) -> bool:
        end_time = start_time + timedelta(minutes=duration_minutes)
        window = self.get_availability_window(db, ambassador_id, start_time, end_time)
        required_slots = duration_minutes // SLOT_MINUTES
        available_slots = [
            slot
            for slot in window.slots
            if slot.state == "available"
            and slot.start_time >= start_time
            and slot.end_time <= end_time
        ]
        return len(available_slots) == required_slots

    def create_meeting_request(
        self,
        db: Session,
        student: User,
        ambassador_id: str,
        start_time: datetime,
        duration_minutes: int,
        meeting_type: MeetingType,
        location: str | None = None,
        notes: str | None = None,
    ) -> Meeting:
        if student.role != UserRole.student:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Only students can request meetings."
            )
        if duration_minutes not in {30, 60}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duration must be 30 or 60 minutes.",
            )

        ambassador = db.scalar(
            select(User)
            .options(joinedload(User.ambassador_profile))
            .where(User.id == ambassador_id, User.role == UserRole.ambassador)
        )
        if not ambassador or not ambassador.ambassador_profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ambassador not found.")

        start_time_utc = self._to_utc(start_time)
        if not self._is_slot_range_available(db, ambassador_id, start_time_utc, duration_minutes):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The selected time is no longer available.",
            )

        if meeting_type.value not in ambassador.ambassador_profile.meeting_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ambassador does not support the selected meeting type.",
            )

        meeting = Meeting(
            student_id=student.id,
            ambassador_id=ambassador_id,
            start_time=start_time_utc,
            end_time=start_time_utc + timedelta(minutes=duration_minutes),
            meeting_type=meeting_type,
            status=MeetingStatus.pending,
            location=location,
            notes=notes,
        )
        db.add(meeting)
        db.commit()
        db.refresh(meeting)
        return db.scalar(
            select(Meeting)
            .options(joinedload(Meeting.student), joinedload(Meeting.ambassador))
            .where(Meeting.id == meeting.id)
        )

    def update_meeting_status(
        self,
        db: Session,
        meeting_id: str,
        actor: User,
        new_status: MeetingStatus,
        location: str | None = None,
        notes: str | None = None,
    ) -> Meeting:
        meeting = db.scalar(
            select(Meeting)
            .options(joinedload(Meeting.student), joinedload(Meeting.ambassador))
            .where(Meeting.id == meeting_id)
        )
        if not meeting:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found.")

        if actor.role == UserRole.ambassador and meeting.ambassador_id != actor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")
        if actor.role == UserRole.student and meeting.student_id != actor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")

        if new_status in {MeetingStatus.confirmed, MeetingStatus.declined} and actor.role != UserRole.ambassador:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only ambassadors can confirm or decline requests.",
            )
        if new_status == MeetingStatus.cancelled and actor.role not in {UserRole.student, UserRole.ambassador}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")

        meeting.status = new_status
        if location is not None:
            meeting.location = location
        if notes is not None:
            meeting.notes = notes
        if new_status == MeetingStatus.confirmed and meeting.meeting_type == MeetingType.virtual:
            meeting.meeting_link = f"https://demo.utambassador.ai/meet/{meeting.id}"

        db.add(meeting)
        db.commit()
        db.refresh(meeting)
        return db.scalar(
            select(Meeting)
            .options(joinedload(Meeting.student), joinedload(Meeting.ambassador))
            .where(Meeting.id == meeting_id)
        )

    def list_meetings_for_user(self, db: Session, user: User) -> list[Meeting]:
        if user.role == UserRole.student:
            query = select(Meeting).where(Meeting.student_id == user.id)
        elif user.role == UserRole.ambassador:
            query = select(Meeting).where(Meeting.ambassador_id == user.id)
        else:
            query = select(Meeting)

        return db.scalars(
            query.options(joinedload(Meeting.student), joinedload(Meeting.ambassador)).order_by(
                Meeting.start_time
            )
        ).all()
