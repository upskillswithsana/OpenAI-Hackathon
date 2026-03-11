from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_scheduling_service, require_roles
from app.db.session import get_db
from app.models import User, UserRole
from app.schemas.ambassadors import AvailabilityConfigResponse, AvailabilityUpsertRequest
from app.schemas.meetings import MeetingResponse
from app.services.availability import SchedulingService
from app.services.presenters import present_meeting


router = APIRouter(prefix="/me", tags=["me"])


@router.get("/meetings", response_model=list[MeetingResponse])
def list_my_meetings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    scheduling_service: SchedulingService = Depends(get_scheduling_service),
) -> list[MeetingResponse]:
    meetings = scheduling_service.list_meetings_for_user(db, current_user)
    return [present_meeting(meeting) for meeting in meetings]


@router.get(
    "/availability",
    response_model=AvailabilityConfigResponse,
)
def get_my_availability(
    current_user: User = Depends(require_roles(UserRole.ambassador)),
    db: Session = Depends(get_db),
    scheduling_service: SchedulingService = Depends(get_scheduling_service),
) -> AvailabilityConfigResponse:
    return scheduling_service.get_availability_config(db, current_user.id)


@router.post(
    "/availability",
    response_model=AvailabilityConfigResponse,
)
def update_my_availability(
    payload: AvailabilityUpsertRequest,
    current_user: User = Depends(require_roles(UserRole.ambassador)),
    db: Session = Depends(get_db),
    scheduling_service: SchedulingService = Depends(get_scheduling_service),
) -> AvailabilityConfigResponse:
    return scheduling_service.update_availability(db, current_user.id, payload)

