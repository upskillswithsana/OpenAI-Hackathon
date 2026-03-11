from pydantic import BaseModel

from app.schemas.common import UserSummary


class DemoLoginRequest(BaseModel):
    email: str


class DemoLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserSummary

