from pydantic import BaseModel, Field

from app.schemas.ambassadors import AmbassadorCard


class AskRequest(BaseModel):
    question: str = Field(min_length=4)


class Citation(BaseModel):
    title: str
    source: str | None = None
    snippet: str


class AskResponse(BaseModel):
    answer: str
    citations: list[Citation]
    suggested_ambassadors: list[AmbassadorCard]

