import hashlib
import math
import re
from collections.abc import Iterable

import chromadb
from chromadb.api.models.Collection import Collection
from openai import OpenAI
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.models import KnowledgeChunk, KnowledgeDocument, User
from app.schemas.ai import Citation
from app.services.matching import MatchingService, tokenize


TAG_DICTIONARY = {
    "msitm": {"msitm", "it", "technology", "information", "systems"},
    "housing": {"housing", "apartment", "apartments", "rent", "lease", "dorm", "residence"},
    "internships": {"internship", "internships", "career", "jobs", "recruiting"},
    "mccombs": {"mccombs", "business", "bba", "mba"},
    "clubs": {"club", "clubs", "organization", "organizations", "student", "networking"},
    "international": {"international", "visa", "f1", "global"},
    "admissions": {"admissions", "application", "essay", "deadline"},
    "campus_life": {"campus", "life", "student", "resources", "culture"},
}


class KnowledgeService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._client = None
        self._collection = None
        self._openai_client = None

    def _get_chroma_client(self):
        if self._client is None:
            if self.settings.chroma_host:
                self._client = chromadb.HttpClient(
                    host=self.settings.chroma_host, port=self.settings.chroma_port
                )
            else:
                self._client = chromadb.PersistentClient(
                    path=str(self.settings.chroma_persist_directory)
                )
        return self._client

    def _get_collection(self) -> Collection:
        if self._collection is None:
            self._collection = self._get_chroma_client().get_or_create_collection(
                name=self.settings.chroma_collection
            )
        return self._collection

    def _get_openai_client(self) -> OpenAI | None:
        if not self.settings.openai_api_key:
            return None
        if self._openai_client is None:
            self._openai_client = OpenAI(api_key=self.settings.openai_api_key)
        return self._openai_client

    def chunk_text(self, text: str, chunk_size: int = 650, overlap: int = 120) -> list[str]:
        paragraphs = [part.strip() for part in re.split(r"\n\s*\n", text) if part.strip()]
        if not paragraphs:
            return [text.strip()] if text.strip() else []

        chunks: list[str] = []
        current = ""
        for paragraph in paragraphs:
            candidate = f"{current}\n\n{paragraph}".strip() if current else paragraph
            if len(candidate) <= chunk_size:
                current = candidate
                continue
            if current:
                chunks.append(current)
            current = paragraph

        if current:
            chunks.append(current)

        overlapped: list[str] = []
        previous_tail = ""
        for chunk in chunks:
            combined = f"{previous_tail}{chunk}".strip()
            overlapped.append(combined)
            previous_tail = chunk[-overlap:]
        return overlapped

    def _extract_tags(self, text: str) -> list[str]:
        tokens = tokenize(text)
        tags = [tag for tag, keywords in TAG_DICTIONARY.items() if tokens & keywords]
        return tags[:5]

    def _stable_index(self, token: str, dimensions: int) -> int:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        return int.from_bytes(digest[:4], "big") % dimensions

    def _local_embeddings(self, texts: Iterable[str], dimensions: int = 96) -> list[list[float]]:
        embeddings: list[list[float]] = []
        for text in texts:
            vector = [0.0] * dimensions
            for token in tokenize(text):
                vector[self._stable_index(token, dimensions)] += 1.0
            norm = math.sqrt(sum(value * value for value in vector)) or 1.0
            embeddings.append([value / norm for value in vector])
        return embeddings

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        client = self._get_openai_client()
        if client is None:
            return self._local_embeddings(texts)

        response = client.embeddings.create(model=self.settings.openai_embedding_model, input=texts)
        return [item.embedding for item in response.data]

    def ingest_document(
        self,
        db: Session,
        title: str,
        content: str,
        source: str | None,
        created_by_user_id: str | None = None,
    ) -> tuple[KnowledgeDocument, int]:
        chunks = self.chunk_text(content)
        if not chunks:
            raise ValueError("Document content is empty.")

        embeddings = self.embed_texts(chunks)
        document = KnowledgeDocument(
            title=title,
            source=source,
            raw_content=content,
            created_by_user_id=created_by_user_id,
        )
        db.add(document)
        db.flush()

        ids: list[str] = []
        metadatas: list[dict] = []
        for index, chunk in enumerate(chunks):
            vector_id = f"{document.id}:{index}"
            tags = self._extract_tags(f"{title}\n{chunk}")
            ids.append(vector_id)
            metadatas.append(
                {
                    "document_id": document.id,
                    "title": title,
                    "source": source or "",
                    "chunk_index": index,
                    "topic_tags": ",".join(tags),
                }
            )
            db.add(
                KnowledgeChunk(
                    document_id=document.id,
                    chunk_index=index,
                    content=chunk,
                    vector_id=vector_id,
                    topic_tags=tags,
                    metadata_json=metadatas[-1],
                )
            )

        self._get_collection().upsert(
            ids=ids,
            documents=chunks,
            metadatas=metadatas,
            embeddings=embeddings,
        )

        db.commit()
        db.refresh(document)
        return document, len(chunks)

    def retrieve(self, question: str, limit: int = 4) -> list[dict]:
        collection = self._get_collection()
        query_embeddings = self.embed_texts([question])
        try:
            results = collection.query(
                query_embeddings=query_embeddings,
                n_results=limit,
                include=["documents", "metadatas", "distances"],
            )
        except Exception:
            return []

        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]
        merged: list[dict] = []
        for index, content in enumerate(documents):
            merged.append(
                {
                    "content": content,
                    "metadata": metadatas[index] or {},
                    "distance": distances[index] if index < len(distances) else 0.0,
                }
            )
        return merged

    def _fallback_answer(self, question: str, retrieved: list[dict]) -> str:
        if not retrieved:
            return (
                f"I could not find a strong match for '{question}'. Try asking about a specific program, "
                "housing, internships, clubs, or campus resources."
            )

        snippets = []
        for item in retrieved[:3]:
            title = item["metadata"].get("title", "Campus resource")
            content = item["content"].replace("\n", " ").strip()
            snippets.append(f"{title}: {content[:180]}")

        joined = " ".join(snippets)
        return f"Here is the most relevant UT Austin guidance I found: {joined}"

    def _openai_answer(self, question: str, retrieved: list[dict]) -> str | None:
        client = self._get_openai_client()
        if client is None or not retrieved:
            return None

        context = "\n\n".join(
            f"[{item['metadata'].get('title', 'Untitled')}] {item['content']}" for item in retrieved[:4]
        )
        response = client.chat.completions.create(
            model=self.settings.openai_chat_model,
            temperature=0.2,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You answer questions about UT Austin campus life using the provided knowledge. "
                        "Keep the answer concise, practical, and grounded in the source material."
                    ),
                },
                {"role": "user", "content": f"Question: {question}\n\nKnowledge:\n{context}"},
            ],
        )
        return response.choices[0].message.content if response.choices else None

    def answer_question(
        self,
        db: Session,
        user: User,
        question: str,
        matching_service: MatchingService,
    ) -> tuple[str, list[Citation], list[tuple[User, object, float]]]:
        retrieved = self.retrieve(question)
        citations = [
            Citation(
                title=item["metadata"].get("title", "Campus resource"),
                source=item["metadata"].get("source") or None,
                snippet=item["content"][:220].replace("\n", " ").strip(),
            )
            for item in retrieved[:3]
        ]

        answer = self._openai_answer(question, retrieved) or self._fallback_answer(question, retrieved)
        tags: list[str] = []
        for item in retrieved:
            tag_str = item["metadata"].get("topic_tags", "")
            if tag_str:
                tags.extend([tag for tag in tag_str.split(",") if tag])

        suggestions = matching_service.suggest_ambassadors(db, question, user, tags)
        return answer, citations, suggestions

    def list_documents(self, db: Session) -> list[KnowledgeDocument]:
        return db.scalars(
            select(KnowledgeDocument).options(joinedload(KnowledgeDocument.chunks)).order_by(
                KnowledgeDocument.created_at.desc()
            )
        ).all()
