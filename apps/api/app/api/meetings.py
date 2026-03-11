from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_scheduling_service
from app.db.session import get_db
from app.models import User
from app.schemas.meetings import MeetingCreateRequest, MeetingResponse, MeetingStatusUpdateRequest
from app.services.availability import SchedulingService
from app.services.presenters import present_meeting


router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.post("", response_model=MeetingResponse)
def create_meeting_request(
    payload: MeetingCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    scheduling_service: SchedulingService = Depends(get_scheduling_service),
) -> MeetingResponse:
    meeting = scheduling_service.create_meeting_request(
        db=db,
        student=current_user,
        ambassador_id=payload.ambassador_id,
        start_time=payload.start_time,
        duration_minutes=payload.duration_minutes,
        meeting_type=payload.meeting_type,
        location=payload.location,
        notes=payload.notes,
    )
    return present_meeting(meeting)


@router.patch("/{meeting_id}/status", response_model=MeetingResponse)
def update_meeting_status(
    meeting_id: str,
    payload: MeetingStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    scheduling_service: SchedulingService = Depends(get_scheduling_service),
) -> MeetingResponse:
    meeting = scheduling_service.update_meeting_status(
        db,
        meeting_id=meeting_id,
        actor=current_user,
        new_status=payload.status,
        location=payload.location,
        notes=payload.notes,
    )
    return present_meeting(meeting)

