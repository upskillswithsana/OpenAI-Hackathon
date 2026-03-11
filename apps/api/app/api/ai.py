from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_knowledge_service, get_matching_service
from app.db.session import get_db
from app.models import User
from app.schemas.ai import AskRequest, AskResponse
from app.services.knowledge import KnowledgeService
from app.services.matching import MatchingService
from app.services.presenters import present_ambassador_card


router = APIRouter(tags=["ai"])


@router.post("/ai/ask", response_model=AskResponse)
def ask_ai(
    payload: AskRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    knowledge_service: KnowledgeService = Depends(get_knowledge_service),
    matching_service: MatchingService = Depends(get_matching_service),
) -> AskResponse:
    answer, citations, suggestions = knowledge_service.answer_question(
        db, current_user, payload.question, matching_service
    )
    return AskResponse(
        answer=answer,
        citations=citations,
        suggested_ambassadors=[
            present_ambassador_card(ambassador, profile)
            for ambassador, profile, _score in suggestions
        ],
    )

