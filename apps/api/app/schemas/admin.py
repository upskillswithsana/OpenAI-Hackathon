from pydantic import BaseModel


class KnowledgeUploadResponse(BaseModel):
    document_id: str
    title: str
    source: str | None = None
    chunk_count: int

