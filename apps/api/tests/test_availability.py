from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.models import Meeting, MeetingStatus, MeetingType


def test_availability_marks_pending_booked_and_blocked_slots(test_context):
    session_factory = test_context["session_factory"]
    scheduling_service = test_context["services"]["scheduling"]
    ambassador_id = test_context["ids"]["sana"]
    student_id = test_context["ids"]["student"]
    timezone = test_context["timezone"]

    pending_start = datetime(2026, 3, 10, 9, 0, tzinfo=timezone).astimezone(UTC)
    confirmed_start = datetime(2026, 3, 10, 9, 30, tzinfo=timezone).astimezone(UTC)

    with session_factory() as db:
        db.add_all(
            [
                Meeting(
                    student_id=student_id,
                    ambassador_id=ambassador_id,
                    start_time=pending_start,
                    end_time=pending_start + timedelta(minutes=30),
                    status=MeetingStatus.pending,
                    meeting_type=MeetingType.virtual,
                ),
                Meeting(
                    student_id=student_id,
                    ambassador_id=ambassador_id,
                    start_time=confirmed_start,
                    end_time=confirmed_start + timedelta(minutes=30),
                    status=MeetingStatus.confirmed,
                    meeting_type=MeetingType.virtual,
                ),
            ]
        )
        db.commit()

        window = scheduling_service.get_availability_window(
            db,
            ambassador_id=ambassador_id,
            range_start=datetime(2026, 3, 10, 8, 0, tzinfo=timezone),
            range_end=datetime(2026, 3, 12, 15, 0, tzinfo=timezone),
        )

    states = {slot.start_time.isoformat(): slot.state for slot in window.slots}
    assert states[pending_start.isoformat()] == "pending"
    assert states[confirmed_start.isoformat()] == "booked"

    blocked_start = datetime(2026, 3, 12, 14, 0, tzinfo=timezone).astimezone(UTC)
    assert states[blocked_start.isoformat()] == "blocked"
