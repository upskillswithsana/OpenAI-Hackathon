from datetime import UTC, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.dependencies import (
    get_knowledge_service,
    get_matching_service,
    get_scheduling_service,
)
from app.core.security import create_access_token
from app.db.session import get_db
from app.main import app
from app.models import (
    AmbassadorProfile,
    AvailabilityException,
    AvailabilityRule,
    Base,
    StudentProfile,
    User,
    UserRole,
)
from app.services.availability import SchedulingService
from app.services.knowledge import KnowledgeService
from app.services.matching import MatchingService


@pytest.fixture()
def test_context(tmp_path: Path):
    database_path = tmp_path / "test.sqlite3"
    engine = create_engine(
        f"sqlite:///{database_path}",
        future=True,
        connect_args={"check_same_thread": False},
    )
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(bind=engine)

    timezone = ZoneInfo("America/Chicago")

    knowledge_service = KnowledgeService()
    knowledge_service.settings.chroma_host = None
    knowledge_service.settings.chroma_persist_directory = tmp_path / "chroma"
    knowledge_service.settings.chroma_persist_directory.mkdir(parents=True, exist_ok=True)
    knowledge_service._client = None
    knowledge_service._collection = None

    matching_service = MatchingService()
    scheduling_service = SchedulingService()

    def override_get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_knowledge_service] = lambda: knowledge_service
    app.dependency_overrides[get_matching_service] = lambda: matching_service
    app.dependency_overrides[get_scheduling_service] = lambda: scheduling_service

    with SessionLocal() as db:
        admin = User(name="Admin", email="admin@test.ai", role=UserRole.admin)
        student = User(name="Student", email="student@test.ai", role=UserRole.student)
        sana = User(name="Sana", email="sana@test.ai", role=UserRole.ambassador)
        rohan = User(name="Rohan", email="rohan@test.ai", role=UserRole.ambassador)
        jordan = User(name="Jordan", email="jordan@test.ai", role=UserRole.ambassador)
        db.add_all([admin, student, sana, rohan, jordan])
        db.flush()

        db.add(
            StudentProfile(
                user_id=student.id,
                program_interest="MSITM",
                country="India",
                career_interests=["AI", "Product management"],
                goals="Find the best program and internship fit.",
            )
        )

        db.add_all(
            [
                AmbassadorProfile(
                    user_id=sana.id,
                    program="MSITM - McCombs School of Business",
                    major="Information Technology & Management",
                    graduation_year=2026,
                    bio="MSITM ambassador with product and analytics experience.",
                    interests=["AI", "Product management", "Consulting"],
                    career_background="Salesforce Technical Lead",
                    linkedin="https://linkedin.com/in/sana",
                    location="Austin",
                    country="India",
                    meeting_types=["virtual", "in_person"],
                ),
                AmbassadorProfile(
                    user_id=rohan.id,
                    program="MSITM - McCombs School of Business",
                    major="Information Technology & Management",
                    graduation_year=2025,
                    bio="International student ambassador focused on housing and analytics.",
                    interests=["Housing", "Analytics", "International students"],
                    career_background="Solutions Consultant",
                    linkedin="https://linkedin.com/in/rohan",
                    location="Austin",
                    country="India",
                    meeting_types=["virtual", "in_person"],
                ),
                AmbassadorProfile(
                    user_id=jordan.id,
                    program="BBA - McCombs School of Business",
                    major="Finance",
                    graduation_year=2025,
                    bio="Finance ambassador.",
                    interests=["Finance", "Networking"],
                    career_background="Investment Banking Intern",
                    linkedin="https://linkedin.com/in/jordan",
                    location="Austin",
                    country="USA",
                    meeting_types=["virtual"],
                ),
            ]
        )

        db.add_all(
            [
                AvailabilityRule(
                    ambassador_id=sana.id,
                    day_of_week=1,
                    start_time=time(9, 0),
                    end_time=time(12, 0),
                ),
                AvailabilityRule(
                    ambassador_id=sana.id,
                    day_of_week=3,
                    start_time=time(13, 0),
                    end_time=time(17, 0),
                ),
                AvailabilityRule(
                    ambassador_id=rohan.id,
                    day_of_week=1,
                    start_time=time(9, 0),
                    end_time=time(12, 0),
                ),
            ]
        )

        blocked_start = datetime(2026, 3, 12, 14, 0, tzinfo=timezone).astimezone(UTC)
        db.add(
            AvailabilityException(
                ambassador_id=sana.id,
                starts_at=blocked_start,
                ends_at=blocked_start + timedelta(minutes=30),
                reason="Class conflict",
            )
        )

        db.commit()

        tokens = {
            "admin": create_access_token(admin.id),
            "student": create_access_token(student.id),
            "sana": create_access_token(sana.id),
            "rohan": create_access_token(rohan.id),
            "jordan": create_access_token(jordan.id),
        }

        ids = {
            "admin": admin.id,
            "student": student.id,
            "sana": sana.id,
            "rohan": rohan.id,
            "jordan": jordan.id,
        }

    with TestClient(app) as client:
        yield {
            "client": client,
            "session_factory": SessionLocal,
            "tokens": tokens,
            "ids": ids,
            "services": {
                "knowledge": knowledge_service,
                "matching": matching_service,
                "scheduling": scheduling_service,
            },
            "timezone": timezone,
        }

    app.dependency_overrides.clear()
    engine.dispose()

