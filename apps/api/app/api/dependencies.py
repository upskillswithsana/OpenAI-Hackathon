from collections.abc import Callable

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User, UserRole
from app.services.availability import SchedulingService
from app.services.knowledge import KnowledgeService
from app.services.matching import MatchingService


_knowledge_service = KnowledgeService()
_matching_service = MatchingService()
_scheduling_service = SchedulingService()


def get_knowledge_service() -> KnowledgeService:
    return _knowledge_service


def get_matching_service() -> MatchingService:
    return _matching_service


def get_scheduling_service() -> SchedulingService:
    return _scheduling_service


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing auth token.")

    user_id = decode_access_token(authorization.replace("Bearer ", "", 1))
    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
    return user


def require_roles(*roles: UserRole) -> Callable[[User], User]:
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")
        return user

    return dependency
