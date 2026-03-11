from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, select
from sqlalchemy.orm import Session, joinedload

from app.api.dependencies import get_current_user, get_scheduling_service
from app.db.session import get_db
from app.models import AmbassadorProfile, User, UserRole
from app.schemas.ambassadors import AmbassadorCard, AmbassadorDetail, AvailabilityWindowResponse
from app.services.availability import SchedulingService
from app.services.presenters import present_ambassador_card, present_ambassador_detail


router = APIRouter(prefix="/ambassadors", tags=["ambassadors"])


@router.get("", response_model=list[AmbassadorCard])
def list_ambassadors(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> list[AmbassadorCard]:
    rows = db.execute(
        select(User, AmbassadorProfile)
        .join(AmbassadorProfile, AmbassadorProfile.user_id == User.id)
        .where(User.role == UserRole.ambassador)
        .order_by(case((User.email == "sana.ambassador@utdemo.ai", 0), else_=1), User.name)
    ).all()
    return [present_ambassador_card(user, profile) for user, profile in rows]


@router.get("/{ambassador_id}", response_model=AmbassadorDetail)
def get_ambassador(
    ambassador_id: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> AmbassadorDetail:
    ambassador = db.scalar(
        select(User)
        .options(
            joinedload(User.ambassador_profile).joinedload(AmbassadorProfile.availability_rules),
            joinedload(User.ambassador_profile).joinedload(AmbassadorProfile.availability_exceptions),
        )
        .where(User.id == ambassador_id, User.role == UserRole.ambassador)
    )
    if not ambassador or not ambassador.ambassador_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ambassador not found.")
    return present_ambassador_detail(ambassador, ambassador.ambassador_profile)


@router.get("/{ambassador_id}/availability", response_model=AvailabilityWindowResponse)
def get_ambassador_availability(
    ambassador_id: str,
    from_date: datetime | None = Query(default=None, alias="from"),
    to_date: datetime | None = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
    scheduling_service: SchedulingService = Depends(get_scheduling_service),
) -> AvailabilityWindowResponse:
    now = datetime.now(UTC)
    range_start = from_date or now
    range_end = to_date or (range_start + timedelta(days=14))
    return scheduling_service.get_availability_window(db, ambassador_id, range_start, range_end)
