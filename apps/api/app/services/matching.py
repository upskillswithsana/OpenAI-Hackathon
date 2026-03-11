import re

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import AmbassadorProfile, User, UserRole


TOKEN_RE = re.compile(r"[a-zA-Z0-9]+")


def tokenize(text: str) -> set[str]:
    return {token.lower() for token in TOKEN_RE.findall(text) if len(token) > 1}


class MatchingService:
    def suggest_ambassadors(
        self,
        db: Session,
        question: str,
        user: User,
        topic_tags: list[str] | None = None,
        limit: int = 3,
    ) -> list[tuple[User, AmbassadorProfile, float]]:
        tags = topic_tags or []
        question_tokens = tokenize(question)
        tag_tokens = tokenize(" ".join(tags))
        preference_tokens = set()

        if user.student_profile:
            if user.student_profile.program_interest:
                preference_tokens |= tokenize(user.student_profile.program_interest)
            preference_tokens |= tokenize(" ".join(user.student_profile.career_interests))
            if user.student_profile.country:
                preference_tokens |= tokenize(user.student_profile.country)

        combined = question_tokens | tag_tokens | preference_tokens
        query = (
            select(User, AmbassadorProfile)
            .join(AmbassadorProfile, AmbassadorProfile.user_id == User.id)
            .options(selectinload(User.ambassador_profile))
            .where(User.role == UserRole.ambassador)
        )

        scored: list[tuple[User, AmbassadorProfile, float]] = []
        for ambassador, profile in db.execute(query).all():
            score = 0.0
            profile_tokens = tokenize(
                " ".join(
                    filter(
                        None,
                        [
                            profile.program,
                            profile.major,
                            profile.bio,
                            profile.career_background,
                            profile.country,
                            " ".join(profile.interests),
                        ],
                    )
                )
            )

            overlap = combined & profile_tokens
            score += len(overlap) * 1.2

            if user.student_profile and user.student_profile.program_interest:
                if tokenize(user.student_profile.program_interest) & tokenize(profile.program):
                    score += 4.0

            if tokenize(profile.program) & question_tokens:
                score += 4.0
            if tokenize(profile.major) & question_tokens:
                score += 2.0
            if tokenize(" ".join(profile.interests)) & question_tokens:
                score += 2.0

            if user.student_profile and user.student_profile.country and profile.country:
                if user.student_profile.country.lower() == profile.country.lower():
                    score += 1.5

            if "international" in question_tokens and profile.country and profile.country.lower() != "usa":
                score += 1.5

            if score > 0:
                scored.append((ambassador, profile, score))

        scored.sort(key=lambda item: (-item[2], item[0].name))
        return scored[:limit]

