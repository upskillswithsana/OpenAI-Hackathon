from sqlalchemy import select

from app.models import AmbassadorProfile, User


def test_matching_prioritizes_program_fit(test_context):
    session_factory = test_context["session_factory"]
    matching_service = test_context["services"]["matching"]
    student_id = test_context["ids"]["student"]

    with session_factory() as db:
        student = db.scalar(select(User).where(User.id == student_id))
        suggestions = matching_service.suggest_ambassadors(
            db,
            "How difficult is the MSITM program and what are the best internships for international students?",
            student,
            ["msitm", "internships", "international"],
        )

    ranked_emails = [user.email for user, _profile, _score in suggestions]
    assert ranked_emails[0] in {"sana@test.ai", "rohan@test.ai"}
    assert "jordan@test.ai" not in ranked_emails[:2]

