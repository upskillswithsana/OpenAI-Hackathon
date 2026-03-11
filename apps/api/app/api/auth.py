from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.db.session import get_db
from app.models import User
from app.schemas.auth import DemoLoginRequest, DemoLoginResponse
from app.services.presenters import present_user


router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/demo-users")
def list_demo_users(db: Session = Depends(get_db)) -> list[dict]:
    users = db.scalars(select(User).order_by(User.role, User.name)).all()
    return [present_user(user).model_dump() for user in users]


@router.post("/demo-login", response_model=DemoLoginResponse)
def demo_login(payload: DemoLoginRequest, db: Session = Depends(get_db)) -> DemoLoginResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demo user not found.")
    return DemoLoginResponse(access_token=create_access_token(user.id), user=present_user(user))

