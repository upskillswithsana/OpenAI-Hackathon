import enum
import uuid
from datetime import UTC, datetime, time

from sqlalchemy import JSON, Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, Time
from sqlalchemy.orm import Mapped, foreign, mapped_column, relationship

from app.models.base import Base


def uuid_str() -> str:
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    student = "student"
    ambassador = "ambassador"
    admin = "admin"


class MeetingStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    declined = "declined"
    cancelled = "cancelled"


class MeetingType(str, enum.Enum):
    virtual = "virtual"
    in_person = "in_person"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    student_profile: Mapped["StudentProfile | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    ambassador_profile: Mapped["AmbassadorProfile | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False, index=True)
    program_interest: Mapped[str | None] = mapped_column(String(255))
    country: Mapped[str | None] = mapped_column(String(120))
    career_interests: Mapped[list[str]] = mapped_column(JSON, default=list)
    goals: Mapped[str | None] = mapped_column(Text)

    user: Mapped["User"] = relationship(back_populates="student_profile")


class AmbassadorProfile(Base):
    __tablename__ = "ambassador_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False, index=True)
    program: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    major: Mapped[str] = mapped_column(String(255), nullable=False)
    graduation_year: Mapped[int | None] = mapped_column(Integer)
    bio: Mapped[str] = mapped_column(Text, default="")
    interests: Mapped[list[str]] = mapped_column(JSON, default=list)
    career_background: Mapped[str | None] = mapped_column(String(255))
    linkedin: Mapped[str | None] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(255))
    country: Mapped[str | None] = mapped_column(String(120))
    meeting_types: Mapped[list[str]] = mapped_column(JSON, default=list)

    user: Mapped["User"] = relationship(back_populates="ambassador_profile")
    availability_rules: Mapped[list["AvailabilityRule"]] = relationship(
        primaryjoin="AmbassadorProfile.user_id == foreign(AvailabilityRule.ambassador_id)",
        cascade="all, delete-orphan",
    )
    availability_exceptions: Mapped[list["AvailabilityException"]] = relationship(
        primaryjoin="AmbassadorProfile.user_id == foreign(AvailabilityException.ambassador_id)",
        cascade="all, delete-orphan",
    )


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    source: Mapped[str | None] = mapped_column(String(255))
    raw_content: Mapped[str] = mapped_column(Text, nullable=False)
    created_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    chunks: Mapped[list["KnowledgeChunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    document_id: Mapped[str] = mapped_column(ForeignKey("knowledge_documents.id"), nullable=False, index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    vector_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    topic_tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)

    document: Mapped["KnowledgeDocument"] = relationship(back_populates="chunks")


class AvailabilityRule(Base):
    __tablename__ = "availability_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    ambassador_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)

    ambassador: Mapped["User"] = relationship(overlaps="availability_rules")


class AvailabilityException(Base):
    __tablename__ = "availability_exceptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    ambassador_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(255))
    is_available: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    ambassador: Mapped["User"] = relationship(overlaps="availability_exceptions")


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    ambassador_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[MeetingStatus] = mapped_column(
        Enum(MeetingStatus), nullable=False, default=MeetingStatus.pending, index=True
    )
    meeting_type: Mapped[MeetingType] = mapped_column(Enum(MeetingType), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255))
    meeting_link: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    student: Mapped["User"] = relationship(foreign_keys=[student_id])
    ambassador: Mapped["User"] = relationship(foreign_keys=[ambassador_id])
