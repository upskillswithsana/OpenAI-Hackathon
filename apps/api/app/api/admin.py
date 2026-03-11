from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_knowledge_service, require_roles
from app.db.session import get_db
from app.models import User, UserRole
from app.schemas.admin import KnowledgeUploadResponse
from app.services.knowledge import KnowledgeService


router = APIRouter(prefix="/admin", tags=["admin"])


SUPPORTED_UPLOAD_SUFFIXES = {".md", ".markdown", ".txt"}


def _decode_file(file: UploadFile, raw: bytes) -> str:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix and suffix not in SUPPORTED_UPLOAD_SUFFIXES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Upload .md or .txt content for the MVP.",
        )
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Unable to decode uploaded file."
        ) from exc


@router.post("/knowledge/upload", response_model=KnowledgeUploadResponse)
async def upload_knowledge(
    title: str = Form(...),
    source: str | None = Form(default=None),
    content: str | None = Form(default=None),
    file: UploadFile | None = File(default=None),
    _current_user: User = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
    knowledge_service: KnowledgeService = Depends(get_knowledge_service),
) -> KnowledgeUploadResponse:
    if not content and not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either file content or text content.",
        )

    document_content = content or ""
    if file:
        raw = await file.read()
        document_content = _decode_file(file, raw)
        source = source or file.filename

    try:
        document, chunk_count = knowledge_service.ingest_document(
            db=db,
            title=title,
            content=document_content,
            source=source,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return KnowledgeUploadResponse(
        document_id=document.id, title=document.title, source=document.source, chunk_count=chunk_count
    )

